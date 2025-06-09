import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { UserProfile } from '~/types';

interface ConvertKitSubscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: 'active' | 'inactive' | 'cancelled' | 'complained' | 'bounced';
  created_at: string;
  fields: Record<string, unknown>;
}

export const GET: APIRoute = async () => {
  try {
    const apiSecret = import.meta.env.CONVERTKIT_API_SECRET;
    if (!apiSecret) {
      throw new Error('ConvertKit API secret is not set in environment variables.');
    }

    const ckUrl = `https://api.convertkit.com/v3/subscribers?api_secret=${apiSecret}&sort_order=desc&per_page=1000`;

    // --- Parallel Data Fetching ---
    const [ckResponse, dbResult] = await Promise.all([
      fetch(ckUrl),
      supabase.from('user_profiles').select('id, email, created_at, updated_at'),
    ]);

    // --- Error Handling & Data Extraction ---
    if (!ckResponse.ok) {
      const errorText = await ckResponse.text();
      console.error('ConvertKit API Error:', errorText);
      throw new Error(`Failed to fetch from ConvertKit: ${ckResponse.statusText}`);
    }
    const ckData = await ckResponse.json();
    const allCkSubscribers: ConvertKitSubscriber[] = ckData.subscribers || [];

    if (dbResult.error) {
      console.error('Supabase DB Error:', dbResult.error);
      throw dbResult.error;
    }
    const dbUsers = dbResult.data || [];

    // 3. Combine and process user data
    const combinedUsers = new Map<string, UserProfile>();
    const kitStateMap: { [key: string]: UserProfile['kit_state'] } = {
      active: 'active',
      inactive: 'unconfirmed',
    };

    // Process DB users first
    for (const dbUser of dbUsers) {
      if (!dbUser.id || !dbUser.email) continue;
      
      const userProfileData: UserProfile = {
        id: dbUser.id,
        email: dbUser.email,
        created_at: dbUser.created_at || new Date().toISOString(),
        updated_at: dbUser.updated_at || null,
        kit_state: null,
      };

      combinedUsers.set(dbUser.email.toLowerCase(), userProfileData);
    }

    // Process and merge ConvertKit subscribers
    for (const ckUser of allCkSubscribers) {
      const email = ckUser.email_address.toLowerCase();
      const kit_state = (kitStateMap[ckUser.state] || ckUser.state) as UserProfile['kit_state'];
      const existingUser = combinedUsers.get(email);

      if (existingUser) {
        existingUser.kit_state = kit_state;
      } else {
        const viewId = `ck-email-${Buffer.from(ckUser.email_address, 'utf8').toString('base64')}`;
        const userProfileData: UserProfile = {
          id: `kit-${ckUser.id}`,
          view_id: viewId,
          email: ckUser.email_address,
          created_at: ckUser.created_at,
          updated_at: null,
          kit_state: kit_state,
        };
        combinedUsers.set(email, userProfileData);
      }
    }

    // Add view_id to all users for consistent linking
    combinedUsers.forEach(user => {
        if (!user.view_id) {
            user.view_id = user.id;
        }
    });

    const usersArray = Array.from(combinedUsers.values());

    // 4. Calculate summary
    const summary = {
      total: usersArray.length,
      confirmed: usersArray.filter((u) => u.kit_state === 'active').length,
      unconfirmed: usersArray.filter((u) => u.kit_state === 'unconfirmed').length,
      cancelled: usersArray.filter((u) => u.kit_state === 'cancelled').length,
      bounced: usersArray.filter((u) => u.kit_state === 'bounced').length,
      complained: usersArray.filter((u) => u.kit_state === 'complained').length,
      // Cold and Blocked are not standard states from CK, so we report 0 for now.
      cold: 0,
      blocked: 0,
    };

    return new Response(JSON.stringify({ summary, users: usersArray }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in /api/users:', error);
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : 'An unexpected error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 