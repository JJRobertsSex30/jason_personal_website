// This is a new file.
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import type { KitSubscriber, KitTag } from '~/types';

export const prerender = false;

// Helper to fetch subscriber ID from ConvertKit by email
async function getKitSubscriberByEmail(email: string, apiKey: string): Promise<KitSubscriber | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const url = `https://api.kit.com/v4/subscribers?email_address=${encodeURIComponent(normalizedEmail)}`;
    try {
        const response = await fetch(url, {
            headers: { 'X-Kit-Api-Key': apiKey, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            console.error(`Kit API Error (Subscribers): ${response.status} ${await response.text()}`);
            return null;
        }
        const data = await response.json();
        return data.subscribers && data.subscribers.length > 0 ? data.subscribers[0] : null;
    } catch (error) {
        console.error('Error fetching Kit subscriber:', error);
        return null;
    }
}

// Helper to fetch subscriber tags from ConvertKit
async function getKitSubscriberTags(subscriberId: number, apiKey: string): Promise<KitTag[]> {
    const url = `https://api.kit.com/v4/subscribers/${subscriberId}/tags`;
    try {
        const response = await fetch(url, {
            headers: { 'X-Kit-Api-Key': apiKey, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            console.error(`Kit API Error (Tags): ${response.status} ${await response.text()}`);
            return [];
        }
        const data = await response.json();
        return data.tags || [];
    } catch (error) {
        console.error('Error fetching Kit tags:', error);
        return [];
    }
}


export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    const kitApiKey = import.meta.env.CONVERTKIT_API_KEY;

    if (!userId) {
        return new Response(JSON.stringify({ message: "User ID is required" }), { status: 400 });
    }
    
    if (!kitApiKey) {
        return new Response(JSON.stringify({ message: "ConvertKit API key is not configured" }), { status: 500 });
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
        const kitSubscriber = await getKitSubscriberByEmail(userProfile.email, kitApiKey);
        let kitTags: KitTag[] = [];
        if (kitSubscriber) {
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