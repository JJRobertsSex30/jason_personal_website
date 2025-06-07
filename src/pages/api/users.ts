import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

interface ConvertKitSubscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: 'active' | 'inactive' | 'cancelled' | 'complained' | 'bounced';
  created_at: string;
  fields: Record<string, unknown>;
}

// This interface is a bit redundant with UserProfile but helps keep API-specific logic separate.
interface CombinedUser {
  email: string;
  kit_status: string;
  kit_status_color: string;
  db_status: string;
  db_status_color: string;
  created_at: string | null;
  last_seen: string | null;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300';
    case 'unconfirmed':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300';
    case 'complained':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300';
    case 'bounced':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300';
    case 'not_in_kit':
      return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200';
  }
};

export const GET: APIRoute = async () => {
  try {
    const apiSecret = import.meta.env.CONVERTKIT_API_SECRET;
    if (!apiSecret) {
      throw new Error('ConvertKit API secret is not set in environment variables.');
    }

    // 1. Fetch all subscribers from ConvertKit (up to 1000 for now)
    const ckUrl = `https://api.convertkit.com/v3/subscribers?api_secret=${apiSecret}&sort_order=desc&per_page=1000`;
    const ckResponse = await fetch(ckUrl);
    if (!ckResponse.ok) {
      const errorText = await ckResponse.text();
      console.error('ConvertKit API Error:', errorText);
      throw new Error(`Failed to fetch from ConvertKit: ${ckResponse.statusText}`);
    }
    const ckData = await ckResponse.json();
    const allCkSubscribers: ConvertKitSubscriber[] = ckData.subscribers || [];

    // 2. Fetch all user profiles from DB
    const { data: dbUsers, error: dbError } = await supabase
      .from('user_profiles')
      .select('id, email, created_at, updated_at');

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      throw new Error(dbError.message);
    }

    // 3. Combine and process user data
    const combinedUsers = new Map<string, CombinedUser>();
    const kitStateMap = { active: 'confirmed', inactive: 'unconfirmed' };

    // Process DB users first
    for (const dbUser of dbUsers) {
      combinedUsers.set(String(dbUser.email).toLowerCase(), {
        email: String(dbUser.email),
        kit_status: 'not_in_kit',
        kit_status_color: getStatusColor('not_in_kit'),
        db_status: 'active',
        db_status_color: 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300',
        created_at: dbUser.created_at,
        last_seen: dbUser.updated_at,
      });
    }

    // Process and merge ConvertKit subscribers
    for (const ckUser of allCkSubscribers) {
      const email = ckUser.email_address.toLowerCase();
      const kit_status = kitStateMap[ckUser.state] || ckUser.state;
      const existingUser = combinedUsers.get(email);

      if (existingUser) {
        existingUser.kit_status = kit_status;
        existingUser.kit_status_color = getStatusColor(kit_status);
      } else {
        combinedUsers.set(email, {
          email: ckUser.email_address,
          kit_status: kit_status,
          kit_status_color: getStatusColor(kit_status),
          db_status: 'not_in_db',
          db_status_color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
          created_at: ckUser.created_at,
          last_seen: null,
        });
      }
    }

    const usersArray = Array.from(combinedUsers.values());

    // 4. Calculate summary
    const summary = {
      total: usersArray.length,
      confirmed: usersArray.filter(u => u.kit_status === 'confirmed').length,
      unconfirmed: usersArray.filter(u => u.kit_status === 'unconfirmed').length,
      cancelled: usersArray.filter(u => u.kit_status === 'cancelled').length,
      bounced: usersArray.filter(u => u.kit_status === 'bounced').length,
      complained: usersArray.filter(u => u.kit_status === 'complained').length,
      // Cold and Blocked are not standard states, so we report 0 for now.
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