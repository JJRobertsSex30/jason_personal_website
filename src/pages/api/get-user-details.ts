// This is a new file.
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { KitSubscriber, KitTag } from '~/types';
import { getKitSubscriberByEmail, getKitSubscriberTags } from '~/lib/convertkit-operations';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    const kitApiKey = import.meta.env.CONVERTKIT_API_KEY;
    const kitApiSecret = import.meta.env.CONVERTKIT_API_SECRET || kitApiKey; // Fallback for secret

    if (!userId) {
        return new Response(JSON.stringify({ message: "User ID is required" }), { status: 400 });
    }
    
    if (!kitApiKey || !kitApiSecret) {
        return new Response(JSON.stringify({ message: "ConvertKit API credentials are not configured" }), { status: 500 });
    }

    try {
        // 1. Fetch user profile from our database
        const { data: userProfile, error: dbError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (dbError || !userProfile) {
            return new Response(JSON.stringify({ message: dbError?.message || "User not found in database" }), { status: 404 });
        }

        // 2. Fetch referrals for the user
        // This is a placeholder since the schema is not fully known.
        // Assuming a 'referrals' table with referrer_id and referee_id
        const { data: referrals, error: referralsError } = await supabase
            .from('referrals')
            .select('*, referee:referee_id(*)') // Example join
            .eq('referrer_id', userId);
        
        if (referralsError) {
             console.warn(`Could not fetch referrals for user ${userId}: ${referralsError.message}`);
        }

        // 3. Fetch data from ConvertKit
        const kitSubscriber = await getKitSubscriberByEmail(userProfile.email, kitApiSecret);
        let kitTags: KitTag[] = [];
        if (kitSubscriber && kitApiKey) { // Ensure apiKey is present for tag fetching
            kitTags = await getKitSubscriberTags(kitSubscriber.id, kitApiKey);
        }

        // 4. Combine all data into a single response
        const responsePayload = {
            profile: userProfile,
            referrals: referrals || [],
            kit: {
                subscriber: kitSubscriber,
                tags: kitTags,
            },
        };

        return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in get-user-details endpoint:", error);
        return new Response(JSON.stringify({ message: "An unexpected error occurred" }), { status: 500 });
    }
}; 