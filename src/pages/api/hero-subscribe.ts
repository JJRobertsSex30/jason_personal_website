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

// Placeholder for ConvertKit interactions
async function updateConvertKitSubscriber(email: string, firstName?: string | null, existingKitId?: string | null): Promise<{ success: boolean; subscriberId?: string; error?: string }> {
  const CONVERTKIT_API_KEY = import.meta.env.CONVERTKIT_API_KEY as string;
  const PUBLIC_CONVERTKIT_FORM_ID = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID as string;
  const CONVERTKIT_TAG_ID_NOT_VERIFIED = import.meta.env.CONVERTKIT_TAG_ID_NOT_VERIFIED as string;

  if (!CONVERTKIT_API_KEY || !CONVERTKIT_TAG_ID_NOT_VERIFIED) {
    console.error('ConvertKit API Key or relevant Tag ID (NOT_VERIFIED) not configured.');
    return { success: false, error: 'ConvertKit integration not configured (API Key or Tag ID missing).' };
  }

  const API_BASE_URL = 'https://api.convertkit.com/v3';
  let subscriberId = existingKitId;

  try {
    // Step 1: Optionally, subscribe to a general form if PUBLIC_CONVERTKIT_FORM_ID is set.
    // This can be useful for general list management beyond just tagging.
    if (PUBLIC_CONVERTKIT_FORM_ID) {
      const formSubscribeUrl = `${API_BASE_URL}/forms/${PUBLIC_CONVERTKIT_FORM_ID}/subscribe`;
      console.log(`[ConvertKit] Attempting to subscribe ${email} to form ${PUBLIC_CONVERTKIT_FORM_ID}`);
      const formResponse = await fetch(formSubscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email: email,
          first_name: firstName || undefined,
        }),
      });

      if (!formResponse.ok) {
        // Don't make this a hard failure, as the user might already be on the form or another issue.
        // Tagging is the more critical step for the verification flow.
        const errorData = await formResponse.json().catch(() => ({ message: 'Failed to parse error JSON from form subscription' }));
        console.warn(`[ConvertKit] Failed to subscribe ${email} to form ${PUBLIC_CONVERTKIT_FORM_ID}. Status: ${formResponse.status}. Error: ${errorData.message || formResponse.statusText}`);
      } else {
        const formJson = await formResponse.json();
        if (formJson.subscription && formJson.subscription.subscriber && formJson.subscription.subscriber.id && !subscriberId) {
            subscriberId = formJson.subscription.subscriber.id.toString();
        }
        console.log(`[ConvertKit] Successfully subscribed/updated ${email} on form ${PUBLIC_CONVERTKIT_FORM_ID}.`);
      }
    }

    // Step 2: Tag the subscriber with the "email not verified" tag.
    // This is the crucial step to trigger the verification email sequence from ConvertKit.
    console.log(`[ConvertKit] Attempting to tag ${email} with tag ID ${CONVERTKIT_TAG_ID_NOT_VERIFIED}`);
    const tagUserUrl = `${API_BASE_URL}/tags/${CONVERTKIT_TAG_ID_NOT_VERIFIED}/subscribe`;
    const tagResponse = await fetch(tagUserUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        api_key: CONVERTKIT_API_KEY,
        email: email,
        first_name: firstName || undefined,
      }),
    });

    if (!tagResponse.ok) {
      const errorData = await tagResponse.json().catch(() => ({ message: 'Failed to parse error JSON from tagging' }));
      console.error(`[ConvertKit] Failed to tag subscriber ${email} with tag ${CONVERTKIT_TAG_ID_NOT_VERIFIED}. Status: ${tagResponse.status}. Error: ${errorData.message || tagResponse.statusText}`);
      return { success: false, error: `Failed to apply 'not verified' tag: ${errorData.message || tagResponse.statusText}` };
    }

    const tagJson = await tagResponse.json();
    // The response from adding a tag includes subscriber details, which can give us the subscriber_id if not already known.
    if (!subscriberId && tagJson.subscription && tagJson.subscription.subscriber && tagJson.subscription.subscriber.id) {
        subscriberId = tagJson.subscription.subscriber.id.toString();
    }
    console.log(`[ConvertKit] Successfully tagged ${email} with tag ID ${CONVERTKIT_TAG_ID_NOT_VERIFIED}. Subscriber ID: ${subscriberId}`);
    return { success: true, subscriberId: subscriberId ?? undefined };

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
    console.warn('[API /hero-subscribe] Error parsing JSON body:', _e);
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
            source: 'hero-subscribe-api', 
            userAgent: userAgent || request.headers.get('user-agent') || undefined 
        }
    };
    const { error: impressionError } = await logHeroImpression(impressionDetails);
    if (impressionError) {
        console.warn(`[API /hero-subscribe] Failed to log A/B impression for user ${userProfileId}:`, impressionError.message);
    }
  }

  if (isAlreadyVerified) {
    return new Response(JSON.stringify({ message: 'This email address is already verified.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Generate and Store Verification Token
  const { token: verificationToken, error: tokenError } = await generateAndStoreVerificationToken(userProfileId, email);

  if (tokenError || !verificationToken) {
    return new Response(JSON.stringify({ message: 'Error generating verification token.', error: typeof tokenError === 'string' ? tokenError : tokenError?.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // 4. Interact with ConvertKit & Trigger Verification Email (via Kit automation)
  const kitResult = await updateConvertKitSubscriber(email, user.first_name, user.kit_subscriber_id);

  if (!kitResult.success) {
    console.error(`[API /hero-subscribe] ConvertKit update failed for ${email}:`, kitResult.error);
  }
  
  if (kitResult.subscriberId && kitResult.subscriberId !== user.kit_subscriber_id) {
      const { error: kitIdUpdateError } = await supabase
          .from('user_profiles')
          .update({ kit_subscriber_id: kitResult.subscriberId })
          .eq('id', userProfileId);
      if (kitIdUpdateError) {
          console.warn(`[API /hero-subscribe] Failed to update kit_subscriber_id for user ${userProfileId}:`, kitIdUpdateError.message);
      }
  }

  // The actual verification email link is constructed on the page that handles token verification (e.g. /verify-email)
  // The link sent by ConvertKit should point to: `${site?.origin || 'YOUR_FALLBACK_DOMAIN'}/verify-email?token=${verificationToken}`
  // Ensure your ConvertKit email template includes this dynamic link construction correctly.
  // For now, the API just confirms the process is initiated.

  return new Response(JSON.stringify({ message: 'Verification process initiated. Please check your email to complete verification.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}; 