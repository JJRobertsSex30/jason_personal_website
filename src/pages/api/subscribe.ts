import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import {
  findOrCreateUserForVerification,
  generateAndStoreVerificationToken,
  logHeroImpression
} from '~/lib/database-operations';
import type {
  ImpressionData
} from '~/lib/database-operations'; // UserProfile removed as it's inferred

// Define HeroSubscribeRequestBody here if not imported from a central types file
export interface HeroSubscribeRequestBody {
  email: string;
  experimentName: string;
  experimentId: string; // UUID
  variantId: string; // UUID
  pageUrl?: string; // Optional: URL of the page where submission happened
  userAgent?: string; // Optional: User agent for richer impression data
  // Add any other client-side available data you want to pass for impression logging
}

// Define a type for ConvertKit payloads for better type safety
interface ConvertKitPayload {
  api_key: string;
  email: string;
  first_name?: string;
  fields?: Record<string, string | number | undefined>;
  // Add other ConvertKit specific fields here if needed, e.g., tags for direct tagging API if different
}

// Updated ConvertKit function to include referral_id and insight_gems
async function updateConvertKitSubscriber(
  email: string, 
  firstName?: string | null, 
  existingKitId?: string | null,
  referralCode?: string | null,
  insightGems?: number,
  appConfirmationToken?: string | null // New parameter for the verification token
): Promise<{ success: boolean; subscriberId?: string; error?: string }> {
  const CONVERTKIT_API_KEY = import.meta.env.CONVERTKIT_API_KEY as string;
  const PUBLIC_CONVERTKIT_FORM_ID = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID as string;
  // CONVERTKIT_TAG_ID_NOT_VERIFIED is no longer used here as per user feedback.

  if (!CONVERTKIT_API_KEY) { // Removed CONVERTKIT_TAG_ID_NOT_VERIFIED from this check
    console.error('ConvertKit API Key not configured.');
    return { success: false, error: 'ConvertKit integration not configured (API Key missing).' };
  }

  const API_BASE_URL = 'https://api.convertkit.com/v3';
  let subscriberId = existingKitId;

  // Prepare custom fields payload
  const customFields: Record<string, string | number | undefined> = {
    signup_source: 'hero',
    signup_timestamp: new Date().toISOString(),
  };
  if (referralCode) {
    customFields.referral_id = referralCode; 
  }
  if (typeof insightGems === 'number') {
    customFields.insight_gems = insightGems;
  }
  if (appConfirmationToken) { // Add app_confirmation_token if provided
    customFields.app_confirmation_token = appConfirmationToken;
  }

  try {
    if (PUBLIC_CONVERTKIT_FORM_ID) {
      const formSubscribeUrl = `${API_BASE_URL}/forms/${PUBLIC_CONVERTKIT_FORM_ID}/subscribe`;
      console.log(`[ConvertKit] Attempting to subscribe ${email} to form ${PUBLIC_CONVERTKIT_FORM_ID}`);
      const formPayload: ConvertKitPayload = {
        api_key: CONVERTKIT_API_KEY,
        email: email,
      };
      if (firstName) formPayload.first_name = firstName;
      if (Object.keys(customFields).length > 0) formPayload.fields = customFields;

      console.log(`[ConvertKit] Subscribing to form ${PUBLIC_CONVERTKIT_FORM_ID}. Payload:`, JSON.stringify(formPayload, null, 2)); // Log payload
      const formResponse = await fetch(formSubscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(formPayload),
      });

      if (!formResponse.ok) {
        const errorData = await formResponse.json().catch(() => ({ message: 'Failed to parse error JSON from form subscription' }));
        console.warn(`[ConvertKit] Failed to subscribe ${email} to form ${PUBLIC_CONVERTKIT_FORM_ID}. Status: ${formResponse.status}. Error: ${errorData.message || formResponse.statusText}`);
        return { success: false, error: `Failed to subscribe to form: ${errorData.message || formResponse.statusText}` };

      } else {
        const formJson = await formResponse.json();
        if (formJson.subscription && formJson.subscription.subscriber && formJson.subscription.subscriber.id && !subscriberId) {
            subscriberId = formJson.subscription.subscriber.id.toString();
        }
        console.log(`[ConvertKit] Successfully subscribed/updated ${email} on form ${PUBLIC_CONVERTKIT_FORM_ID}. Subscriber ID: ${subscriberId}`);
        return { success: true, subscriberId: subscriberId ?? undefined };
      }
    } else {
      console.warn('[ConvertKit] PUBLIC_CONVERTKIT_FORM_ID is not configured. Cannot subscribe to form.');
      return { success: false, error: 'ConvertKit form ID not configured for subscription.' };
    }

    // The explicit tagging block for CONVERTKIT_TAG_ID_NOT_VERIFIED has been removed.
    // ConvertKit's form subscription settings should handle the initial "not verified" state.

  } catch (error: unknown) {
    console.error('[ConvertKit] Network or other error during API call:', error);
    let message = 'Network error during ConvertKit interaction.';
    if (error instanceof Error) {
        message = error.message;
    }
    return { success: false, error: message };
  }
}

export const POST: APIRoute = async ({ request, site: _site }) => {
  let requestBody: HeroSubscribeRequestBody;
  try {
    requestBody = await request.json();
  } catch (_e) {
    console.warn('[API /subscribe] Error parsing JSON body:', _e); // Updated log prefix
    return new Response(JSON.stringify({ message: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { email, experimentName, experimentId, variantId, pageUrl, userAgent } = requestBody;

  if (!email || !experimentName || !experimentId || !variantId) {
    return new Response(JSON.stringify({ message: 'Missing required fields: email, experimentName, experimentId, variantId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!email.includes('@')) { // Basic server-side email validation
    return new Response(JSON.stringify({ message: 'Invalid email format.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 1. Find or Create User
  const { user, isAlreadyVerified, error: userError } = await findOrCreateUserForVerification(email);

  if (userError) {
    return new Response(JSON.stringify({ message: 'Error processing user information.', error: typeof userError === 'string' ? userError : userError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (!user) {
    return new Response(JSON.stringify({ message: 'Failed to retrieve or create user profile.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  
  const userProfileId = user.id;

  // 2. Log A/B Impression (only if not already verified or if it's a new interaction for an unverified user)
  if (!isAlreadyVerified) {
    const impressionDetails: ImpressionData = {
        experiment_id: experimentId,
        variant_id: variantId,
        user_identifier: userProfileId,
        page_url: pageUrl || request.headers.get('referer') || undefined,
        metadata: { 
            source: 'subscribe-api', // Updated source name
            userAgent: userAgent || request.headers.get('user-agent') || undefined 
        }
    };
    const { error: impressionError } = await logHeroImpression(impressionDetails);
    if (impressionError) {
        console.warn(`[API /subscribe] Failed to log A/B impression for user ${userProfileId}:`, impressionError.message); // Updated log prefix
    }
  }

  if (isAlreadyVerified) {
    // If already verified, we might still want to update their Kit custom fields if provided,
    // or simply inform them they are already verified.
    // For now, let's try to update Kit even if verified, then return.
    console.log(`[API /subscribe] Email ${email} is already verified. Attempting to update ConvertKit custom fields.`);
    const kitUpdateResult = await updateConvertKitSubscriber(
      email,
      user.first_name,
      user.kit_subscriber_id,
      user.referral_code,
      user.insight_gems,
      null // Pass null for appConfirmationToken for already verified users
    );
    if (!kitUpdateResult.success) {
      console.warn(`[API /subscribe] ConvertKit update failed for already verified user ${email}:`, kitUpdateResult.error);
    }
    if (kitUpdateResult.subscriberId && kitUpdateResult.subscriberId !== user.kit_subscriber_id) {
        // Update kit_subscriber_id in DB
        await supabase.from('user_profiles').update({ kit_subscriber_id: kitUpdateResult.subscriberId }).eq('id', userProfileId);
    }
    return new Response(JSON.stringify({ message: 'This email address is already verified. Profile data updated in ConvertKit if applicable.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Generate and Store Verification Token
  const { token: verificationToken, error: tokenError } = await generateAndStoreVerificationToken(
    userProfileId, 
    email,
    experimentId, // Pass experimentId from requestBody
    variantId     // Pass variantId from requestBody
  );

  if (tokenError || !verificationToken) {
    return new Response(JSON.stringify({ message: 'Error generating verification token.', error: typeof tokenError === 'string' ? tokenError : tokenError?.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // 4. Interact with ConvertKit & Trigger Verification Email (via Kit automation)
  const kitResult = await updateConvertKitSubscriber(
    email, 
    user.first_name, 
    user.kit_subscriber_id,
    user.referral_code,
    user.insight_gems,
    verificationToken // Pass the generated verificationToken here for new/unverified users
  );

  if (!kitResult.success) {
    console.error(`[API /subscribe] ConvertKit update failed for ${email}:`, kitResult.error); // Updated log prefix
    // Don't necessarily fail the whole request if Kit fails, but log it.
    // The verification token is generated, email can still be verified.
  }
  
  if (kitResult.subscriberId && kitResult.subscriberId !== user.kit_subscriber_id) {
      const { error: kitIdUpdateError } = await supabase
          .from('user_profiles')
          .update({ kit_subscriber_id: kitResult.subscriberId })
          .eq('id', userProfileId);
      if (kitIdUpdateError) {
          console.warn(`[API /subscribe] Failed to update kit_subscriber_id for user ${userProfileId}:`, kitIdUpdateError.message); // Updated log prefix
      }
  }

  // Return the desired success message for new/unverified subscriptions
  return new Response(JSON.stringify({ 
    success: true, // Explicitly set success to true
    message: 'Thank you for subscribing! Please check your email to continue your journey.' 
  }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
}; 