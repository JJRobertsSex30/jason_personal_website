import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { UserProfile, KitSubscriber, GemTransaction, UserEngagement } from '~/types';

async function getKitSubscriber(email: string): Promise<KitSubscriber | null> {
  const apiSecret = import.meta.env.CONVERTKIT_API_SECRET;
  if (!apiSecret || !email) return null;

  try {
    const url = `https://api.convertkit.com/v3/subscribers?api_secret=${apiSecret}&email_address=${encodeURIComponent(email)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`ConvertKit API error for ${email}: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    return data.subscribers && data.subscribers.length > 0 ? data.subscribers[0] : null;
  } catch (error) {
    console.error(`Failed to fetch from ConvertKit for ${email}:`, error);
    return null;
  }
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ message: 'User ID is required' }), { status: 400 });
  }

  try {
    let userProfile: UserProfile | null = null;
    let kitData: KitSubscriber | null = null;
    let gemTransactions: GemTransaction[] = [];
    let userEngagements: UserEngagement[] = [];
    let confirmedReferrals: UserProfile[] = [];

    let emailToSearch: string | undefined;

    if (id.startsWith('ck-email-')) {
        // This is a ConvertKit-only user identified by a base64 email
        emailToSearch = Buffer.from(id.replace('ck-email-', ''), 'base64').toString('utf-8');
    } else {
        // This should be a Supabase UUID
        const { data: dbUser, error: dbError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (dbError && dbError.code !== 'PGRST116') { // Ignore 'not found' error for now
            throw dbError;
        }
        
        if (dbUser) {
            userProfile = dbUser;
            emailToSearch = dbUser.email;

            // Fetch related data only if user is in DB
            const [gems, engagements, referrals] = await Promise.all([
                 supabase.from('gem_transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }),
                 supabase.from('user_engagements').select('*').eq('user_id', id).order('created_at', { ascending: false }),
                 supabase.from('referrals').select('new_user_id').eq('referrer_id', id)
            ]);
            if(gems.data) gemTransactions = gems.data;
            if(engagements.data) userEngagements = engagements.data;

            if (referrals.data && referrals.data.length > 0) {
                const referredUserIds = referrals.data.map(r => r.new_user_id);
                const { data: referredUsers, error: referredUsersError } = await supabase
                    .from('user_profiles')
                    .select('id, email, kit_state')
                    .in('id', referredUserIds)
                    .eq('kit_state', 'active');
                
                if (referredUsersError) {
                    console.error('Error fetching referred user profiles:', referredUsersError);
                } else if (referredUsers) {
                    confirmedReferrals = referredUsers;
                }
            }
        }
    }

    if (emailToSearch) {
        kitData = await getKitSubscriber(emailToSearch);
    }
    
    // If we started with a CK user, we might not have a DB profile. Let's create a temporary one.
    if (!userProfile && kitData) {
        userProfile = {
            id: `kit-${kitData.id}`,
            email: kitData.email_address,
            created_at: kitData.created_at,
            kit_state: kitData.state
        };
    } else if (userProfile && kitData) {
        // Sync kit_state if we have both
        userProfile.kit_state = kitData.state;
    }

    if (!userProfile) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ userProfile, kitData, gemTransactions, userEngagements, confirmedReferrals }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in /api/users/[id]:', error);
    const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
}; 