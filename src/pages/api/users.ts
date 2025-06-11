import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { UserProfile, KitSubscriber } from '~/types';

export const GET: APIRoute = async () => {
  try {
    const apiKey = import.meta.env.CONVERTKIT_API_KEY;

    if (!apiKey) {
      throw new Error('ConvertKit API key is not set in environment variables.');
    }

    const ckUrl = `https://api.kit.com/v4/subscribers`;

    const [ckResponse, dbResult] = await Promise.all([
      fetch(ckUrl, {
        headers: {
          'X-Kit-Api-Key': apiKey,
          'Accept': 'application/json'
        }
      }),
      supabase.from('user_profiles').select('id, email, created_at, updated_at, deleted_at'),
    ]);

    // --- Error Handling & Data Extraction ---
    if (!ckResponse.ok) {
      const errorText = await ckResponse.text();
      console.error('ConvertKit API Error:', errorText);
      throw new Error(`Failed to fetch from ConvertKit: ${ckResponse.statusText}`);
    }
    const ckData = await ckResponse.json();
    const allCkSubscribers: KitSubscriber[] = ckData.subscribers || [];

    if (dbResult.error) {
      console.error('Supabase DB Error:', dbResult.error);
      throw dbResult.error;
    }
    const dbUsers = dbResult.data || [];

    // Create a map of real database users, keyed by email.
    const usersMap = new Map<string, UserProfile>();
    for (const dbUser of dbUsers) {
      if (dbUser.id && dbUser.email) {
        usersMap.set(dbUser.email.toLowerCase(), {
          id: dbUser.id,
          view_id: dbUser.id, // The view_id is the same as the user's actual ID
          email: dbUser.email,
          created_at: dbUser.created_at || new Date().toISOString(),
          updated_at: dbUser.updated_at || null,
          // If soft-deleted in our DB, their status is 'cancelled'. This is the source of truth.
          kit_state: dbUser.deleted_at ? 'cancelled' : null, 
          convertkit_id: null, // Default state
        });
      }
    }

    // Enrich the real users with data from ConvertKit
    for (const ckUser of allCkSubscribers) {
      const email = ckUser.email_address.toLowerCase();
      const userInDb = usersMap.get(email);

      if (userInDb) {
        // Only update status from Kit if our DB does not consider the user deleted.
        if (userInDb.kit_state !== 'cancelled') {
          userInDb.kit_state = ckUser.state;
        }
        userInDb.convertkit_id = ckUser.id;
      }
      // If the user is in ConvertKit but not in our DB, we IGNORE them.
      // The dashboard should only show users that exist in our system.
    }

    const usersArray = Array.from(usersMap.values());

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