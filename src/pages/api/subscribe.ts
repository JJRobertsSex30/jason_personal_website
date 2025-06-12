import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import {
  findOrCreateUserForVerification,
  generateAndStoreVerificationToken,
  logHeroImpression
} from '~/lib/database-operations';
import type {
  ImpressionInsertData,
  ImpressionRecord,
  SingleResult
} from '~/lib/database-operations';
import { updateConvertKitSubscriber } from '~/lib/convertkit-operations';

// Define HeroSubscribeRequestBody here if not imported from a central types file
export interface HeroSubscribeRequestBody {
  email: string;
  experimentName: string;
  experimentId: string; // UUID
  variantId: string; // UUID
  pageUrl?: string; // Optional: URL of the page where submission happened
  userAgent?: string; // Optional: User agent for richer impression data
  sessionIdentifier?: string; // ADDED: To receive session identifier from client
  deviceType?: string;        // ADDED: To receive device type from client
  // Add any other client-side available data you want to pass for impression logging
}

type DeviceTypeEnum = 'mobile' | 'tablet' | 'desktop' | 'unknown';

function isValidDeviceType(type: string | undefined): type is DeviceTypeEnum {
  if (!type) return false;
  return ['mobile', 'tablet', 'desktop', 'unknown'].includes(type);
}

export const POST: APIRoute = async ({ request, site: _site }) => {
  let requestBody: HeroSubscribeRequestBody;
  try {
    requestBody = await request.json();
    console.log('[API /subscribe] Received requestBody:', JSON.stringify(requestBody, null, 2));
  } catch (_e) {
    console.warn('[API /subscribe] Error parsing JSON body:', _e);
    return new Response(JSON.stringify({ message: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { 
    email, 
    experimentName, 
    experimentId, 
    variantId, 
    pageUrl, 
    userAgent,
    sessionIdentifier,
    deviceType
  } = requestBody;

  console.log('[API /subscribe] Destructured sessionIdentifier:', sessionIdentifier);
  console.log('[API /subscribe] Destructured deviceType:', deviceType);

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
  let loggedImpressionId: string | null = null; // Variable to store the impression ID

  // 2. Log A/B Impression (only if not already verified or if it's a new interaction for an unverified user)
  if (!isAlreadyVerified) {
    const validatedDeviceType = isValidDeviceType(deviceType) ? deviceType : 'unknown';
    const impressionDetails: ImpressionInsertData = {
        experiment_id: experimentId,
        variant_id: variantId,
        user_profile_id: userProfileId,
        page_url: pageUrl || request.headers.get('referer') || undefined,
        session_identifier: sessionIdentifier,
        device_type: validatedDeviceType,
        metadata: { 
            source: 'subscribe-api', 
            userAgent: userAgent || request.headers.get('user-agent') || undefined,
        }
    };
    console.log('[API /subscribe] Constructed impressionDetails for DB:', JSON.stringify(impressionDetails, null, 2));
    
    // Capture the result of logHeroImpression
    const result: SingleResult<ImpressionRecord> = await logHeroImpression(impressionDetails);
    const impressionData: ImpressionRecord | null = result.data;
    const impressionError = result.error;

    if (impressionError) {
        console.warn(`[API /subscribe] Failed to log A/B impression for user ${userProfileId}:`, impressionError.message);
    } else if (impressionData && typeof impressionData.id === 'string') {
        loggedImpressionId = impressionData.id;
        console.log(`[API /subscribe] Impression logged successfully for user ${userProfileId}. Impression ID: ${loggedImpressionId}`);
    } else if (impressionData) {
        // Log if impressionData exists but id is missing or not a string, which would be unexpected
        console.warn(`[API /subscribe] Impression data received for user ${userProfileId}, but ID is missing or invalid:`, impressionData);
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
    experimentId, 
    variantId,
    loggedImpressionId // Pass the loggedImpressionId here
  );

  if (tokenError || !verificationToken) {
    const errorMessage = tokenError ? tokenError.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ message: 'Error generating verification token.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
          console.error(`[API /subscribe] Failed to update kit_subscriber_id for user ${userProfileId}:`, kitIdUpdateError.message);
      }
  }

  // 5. Send final response to the client
  return new Response(
    JSON.stringify({ 
        message: 'Subscription successful! Please check your email to verify your address.',
        userId: userProfileId
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}; 