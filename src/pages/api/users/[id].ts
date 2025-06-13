import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { UserProfile, KitSubscriber, GemTransaction, UserEngagement } from '~/types';
import { getKitSubscriberByEmail } from '~/lib/convertkit-operations';

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
                 supabase.from('gem_transactions').select('*').eq('user_profile_id', id).order('created_at', { ascending: false }),
                 supabase.from('user_engagements').select('*').eq('user_profile_id', id).order('created_at', { ascending: false }),
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
        kitData = await getKitSubscriberByEmail(emailToSearch);
    }
    
    // If we started with a CK user, we might not have a DB profile. Let's create a temporary one.
    if (!userProfile && kitData) {
        userProfile = {
            id: `kit-${kitData.id}`,
            email: kitData.email_address,
            created_at: kitData.created_at,
            kit_state: kitData.state
        };
    } else if (userProfile) {
        // If the user is soft-deleted in our DB, that's the canonical status.
        if (userProfile.deleted_at) {
            userProfile.kit_state = 'cancelled';
        } else if (kitData) {
            // Otherwise, sync the state from ConvertKit.
            userProfile.kit_state = kitData.state;
        }
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