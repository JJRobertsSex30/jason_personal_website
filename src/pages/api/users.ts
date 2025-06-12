import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { UserProfile, KitSubscriber } from '~/types';

export const GET: APIRoute = async () => {
  try {
    const apiSecret = import.meta.env.CONVERTKIT_API_SECRET;
    if (!apiSecret) {
      throw new Error('ConvertKit API secret is not set.');
    }

    // 1. Fetch ALL data from both sources
    const [ckResponse, dbResult] = await Promise.all([
      fetch(`https://api.convertkit.com/v3/subscribers?api_secret=${apiSecret}`, { headers: { 'Accept': 'application/json' } }),
      supabase.from('user_profiles').select('id, email, created_at, updated_at, deleted_at, kit_state'),
    ]);

    if (!ckResponse.ok) throw new Error(`Failed to fetch from ConvertKit: ${ckResponse.statusText}`);
    const ckData = await ckResponse.json();
    const allCkSubscribers: KitSubscriber[] = ckData.subscribers || [];

    if (dbResult.error) throw dbResult.error;
    const dbUsers = dbResult.data || [];
    
    // 2. Create a map of DB users for efficient lookup
    const dbUsersMap = new Map<string, UserProfile>();
    for (const dbUser of dbUsers) {
      if (dbUser.email) {
        dbUsersMap.set(dbUser.email.toLowerCase(), dbUser as UserProfile);
      }
    }

    // 3. Build the final user list, starting with ConvertKit as the base
    const combinedUsersMap = new Map<string, UserProfile>();

    for (const ckUser of allCkSubscribers) {
      const email = ckUser.email_address.toLowerCase();
      const dbProfile = dbUsersMap.get(email);

      if (dbProfile) {
        // User exists in both systems. DB is the source of truth for ID and deletion status.
        combinedUsersMap.set(email, {
          ...dbProfile,
          id: dbProfile.id,
          view_id: dbProfile.id,
          email: dbProfile.email,
          kit_state: dbProfile.deleted_at ? 'cancelled' : ckUser.state, // DB soft-delete overrides Kit state
          convertkit_id: ckUser.id,
        });
        // Remove from db map so we know who is left (DB only)
        dbUsersMap.delete(email);
      } else {
        // User is only in ConvertKit. Treat them as valid but potentially 'cancelled'.
        combinedUsersMap.set(email, {
          id: `kit-${ckUser.id}`,
          view_id: `ck-email-${Buffer.from(email).toString('base64')}`,
          email: ckUser.email_address,
          created_at: ckUser.created_at,
          updated_at: null,
          kit_state: ckUser.state === 'cancelled' ? 'cancelled' : 'unconfirmed', // Or another default
          convertkit_id: ckUser.id,
        });
      }
    }
    
    // 4. Add any remaining users who are only in the DB
    for (const [email, dbProfile] of dbUsersMap.entries()) {
        combinedUsersMap.set(email, {
            ...dbProfile,
            id: dbProfile.id,
            view_id: dbProfile.id,
            email: dbProfile.email,
            kit_state: dbProfile.deleted_at ? 'cancelled' : (dbProfile.kit_state || 'unconfirmed'),
            convertkit_id: null
        });
    }

    const usersArray = Array.from(combinedUsersMap.values());

    // 5. Calculate summary
    const summary = {
      total: usersArray.length,
      confirmed: usersArray.filter((u) => u.kit_state === 'active').length,
      unconfirmed: usersArray.filter((u) => u.kit_state === 'unconfirmed').length,
      cancelled: usersArray.filter((u) => u.kit_state === 'cancelled').length,
      bounced: usersArray.filter((u) => u.kit_state === 'bounced').length,
      complained: usersArray.filter((u) => u.kit_state === 'complained').length,
      cold: 0,
      blocked: 0,
    };

    return new Response(JSON.stringify({ summary, users: usersArray }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in /api/users:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 