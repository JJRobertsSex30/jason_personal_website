import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Explicitly load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const convertKitApiSecret = process.env.CONVERTKIT_API_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !convertKitApiSecret) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface KitSubscriber {
    id: number;
    state: 'active' | 'inactive' | 'cancelled' | 'bounced' | 'complained';
}

async function getKitSubscriber(email: string): Promise<KitSubscriber | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const url = `https://api.convertkit.com/v3/subscribers?api_secret=${convertKitApiSecret}&email_address=${encodeURIComponent(normalizedEmail)}`;
    
    try {
        const response = await fetch(url);
        if (response.status === 429) {
            console.warn('Rate limited by ConvertKit. Pausing for 10 seconds...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            return getKitSubscriber(email); // Retry
        }
        if (!response.ok) {
            console.error(`ConvertKit API Error for ${email}: ${response.status} ${await response.text()}`);
            return null;
        }
        const data = await response.json();
        return data.subscribers && data.subscribers.length > 0 ? data.subscribers[0] : null;
    } catch (error) {
        console.error(`Error fetching Kit subscriber for ${email}:`, error);
        return null;
    }
}

async function backfill() {
    console.log('Starting backfill process for user Kit states...');

    // 1. Fetch all user profiles
    const { data: profiles, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, email, kit_state');

    if (fetchError) {
        console.error('Error fetching user profiles:', fetchError.message);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No user profiles found to backfill.');
        return;
    }

    console.log(`Found ${profiles.length} profiles to process.`);

    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // 2. Iterate and update each profile
    for (const profile of profiles) {
        console.log(`Processing ${profile.email}...`);
        
        const kitSubscriber = await getKitSubscriber(profile.email);

        if (kitSubscriber) {
            const newState = kitSubscriber.state;
            if (profile.kit_state !== newState) {
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update({ kit_state: newState })
                    .eq('id', profile.id);

                if (updateError) {
                    console.error(`Failed to update state for ${profile.email}: ${updateError.message}`);
                    failedCount++;
                } else {
                    console.log(`  -> Updated ${profile.email} from '${profile.kit_state}' to '${newState}'`);
                    updatedCount++;
                }
            } else {
                console.log(`  -> State for ${profile.email} is already up-to-date ('${newState}'). Skipping.`);
                skippedCount++;
            }
        } else {
            console.warn(`Could not find subscriber in ConvertKit for ${profile.email}. Skipping.`);
            failedCount++;
        }
        
        // Pause to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n--- Backfill Complete ---');
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (already up-to-date): ${skippedCount}`);
    console.log(`Failed or not found in Kit: ${failedCount}`);
    console.log('------------------------');
}

backfill().catch(err => {
    console.error("An unexpected error occurred during the backfill process:", err);
}); 