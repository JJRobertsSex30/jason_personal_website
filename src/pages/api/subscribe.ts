// src/pages/api/subscribe.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import { createConvertKitPayload, submitToConvertKit, type SubscriptionSource } from '~/lib/convertkit-config';
import { Buffer } from 'node:buffer'; // For token generation

// For token generation (same as in quiz-submit)
function generateSecureToken(length = 32) {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Buffer.from(randomBytes).toString('hex');
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[API Subscribe ${requestTimestamp}] Received request from IP: ${clientAddress}`);
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const firstNameFormData = formData.get('firstName') || formData.get('first_name') || formData.get('name');
    const firstName = (typeof firstNameFormData === 'string' && firstNameFormData.trim() !== '') ? firstNameFormData.trim() : '';

    // A/B Testing Context from Client
    const abTestVariantId = formData.get('ab_test_variant_id')?.toString() || null; // Supabase variant ID (UUID)
    const browserIdentifier = formData.get('browser_identifier')?.toString() || null;
    const sessionIdentifier = formData.get('session_identifier')?.toString() || null;
    const originalExposureTimestampString = formData.get('original_exposure_timestamp')?.toString() || null;
    const pageUrlAtSubmission = formData.get('page_url_at_submission')?.toString() || request.headers.get('referer') || null;
    
    console.log(`[API Subscribe ${requestTimestamp}] Form Data: email=${email}, firstName=${firstName}, abTestVariantId=${abTestVariantId}`);
    console.log(`[API Subscribe ${requestTimestamp}] A/B Context: browserId=${browserIdentifier}, sessionId=${sessionIdentifier}, exposureTs=${originalExposureTimestampString}, pageUrl=${pageUrlAtSubmission}`);

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ message: 'Valid email address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (abTestVariantId && !browserIdentifier) {
      console.warn(`[API Subscribe ${requestTimestamp}] ab_test_variant_id provided but browser_identifier is missing. This may impact A/B tracking accuracy.`);
    }
    
    const originalExposureTimestamp = originalExposureTimestampString ? new Date(originalExposureTimestampString).toISOString() : null;

    // --- User Profile Handling ---
    let userId: string | undefined;
    let userOwnReferralCode: string | undefined;

    try {
      console.log(`[API Subscribe ${requestTimestamp}] Looking up user: ${email}`);
      const { data: existingUser, error: userLookupError } = await supabase
        .from('user_profiles')
        .select('id, email, referral_code, insight_gems')
        .eq('email', email as string)
        .maybeSingle();

      if (userLookupError) {
        console.error(`[API Subscribe ${requestTimestamp}] DB error looking up user ${email}: ${userLookupError.message}`);
      }

      if (existingUser) {
        userId = existingUser.id;
        userOwnReferralCode = existingUser.referral_code || undefined;
        console.log(`[API Subscribe ${requestTimestamp}] Existing user: ID ${userId}, Name: ${firstName}`);
        if (firstName) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ first_name: firstName })
            .eq('id', userId);
          if (updateError) {
            console.error(`[API Subscribe ${requestTimestamp}] DB error updating user ${userId}: ${updateError.message}`);
          } else {
            console.log(`[API Subscribe ${requestTimestamp}] User ${userId} first_name updated.`);
          }
        }
      } else {
        const newUserId = globalThis.crypto.randomUUID();
        const newUserReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        console.log(`[API Subscribe ${requestTimestamp}] Creating new user: ${email}, ID ${newUserId}, Referral ${newUserReferralCode}`);
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: newUserId,
            email: email as string,
            first_name: firstName || null,
            referral_code: newUserReferralCode,
          });

        if (insertError) {
          console.error(`[API Subscribe ${requestTimestamp}] DB error creating user ${email}: ${insertError.message}`);
        } else {
          userId = newUserId;
          userOwnReferralCode = newUserReferralCode;
          console.log(`[API Subscribe ${requestTimestamp}] New user created: ID ${userId}`);
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[API Subscribe ${requestTimestamp}] Exception during user profile handling: ${errorMessage}`, e);
    }

    // --- Pending Email Confirmation & A/B Context ---
    let actualExperimentUUID: string | null = null;
    if (abTestVariantId) {
      console.log(`[API Subscribe ${requestTimestamp}] Looking up experiment ID for variant_id: "${abTestVariantId}"`);
      const { data: variantRecord, error: variantError } = await supabase
        .from('variants')
        .select('experiment_id, name')
        .eq('id', abTestVariantId)
        .maybeSingle();

      if (variantError) {
        console.error(`[API Subscribe ${requestTimestamp}] DB error fetching experiment ID for variant "${abTestVariantId}": ${variantError.message}`);
      } else if (variantRecord && variantRecord.experiment_id) {
        actualExperimentUUID = variantRecord.experiment_id;
        console.log(`[API Subscribe ${requestTimestamp}] Found experiment ID: ${actualExperimentUUID} for variant_id "${abTestVariantId}" (Variant Name: ${variantRecord.name})`);
      } else {
        console.warn(`[API Subscribe ${requestTimestamp}] No experiment_id found in 'variants' table for variant_id: "${abTestVariantId}". Pending confirmation will not have full A/B experiment context.`);
      }
    } else {
      console.log(`[API Subscribe ${requestTimestamp}] No ab_test_variant_id provided. Pending confirmation will not have A/B variant context.`);
    }

    const confirmationToken = generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const submissionDetails = {
      client_variant_id: abTestVariantId,
      page_url_at_submission: pageUrlAtSubmission,
      user_agent: request.headers.get('user-agent'),
      ip_address: clientAddress,
      form_source: 'subscribe-hero'
    };

    console.log(`[API Subscribe ${requestTimestamp}] Preparing to insert into pending_email_confirmations. Token: ${confirmationToken}, Email: ${email}`);
    const { error: pendingConfirmationError } = await supabase
      .from('pending_email_confirmations')
      .insert({
        email: email as string,
        confirmation_token: confirmationToken,
        variant_id: abTestVariantId,
        experiment_id: actualExperimentUUID,
        browser_identifier: browserIdentifier,
        session_identifier: sessionIdentifier,
        original_exposure_timestamp: originalExposureTimestamp,
        submission_details: submissionDetails,
        expires_at: tokenExpiry,
      });

    if (pendingConfirmationError) {
      console.error(`[API Subscribe ${requestTimestamp}] DB error inserting into pending_email_confirmations: ${pendingConfirmationError.message}`);
    } else {
      console.log(`[API Subscribe ${requestTimestamp}] Successfully inserted into pending_email_confirmations for email: ${email}`);
      console.log(`[API Subscribe ${requestTimestamp}] ACTION NEEDED: Send confirmation email to ${email} (Name: ${firstName}) with token ${confirmationToken}`);
    }

    // --- ConvertKit Subscription ---
    const convertKitApiKey = import.meta.env.CONVERTKIT_API_KEY || import.meta.env.SECRET;
    const convertKitFormIdToUse = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID;

    if (!convertKitApiKey || !convertKitFormIdToUse) {
       console.warn(`[API Subscribe ${requestTimestamp}] ConvertKit API Key or Form ID not set. Skipping ConvertKit.`);
    } else {
        const ckPayloadOptions = {
            firstName: firstName,
            customFields: {
              referral_code: userOwnReferralCode || '', 
              signup_source_detail: 'hero',
              page_referrer: pageUrlAtSubmission || '',
              ab_test_variant_id: abTestVariantId || '',
              app_confirmation_token: confirmationToken,
            },
            referralId: userOwnReferralCode,
        };

        const convertKitPayload = createConvertKitPayload(
            email as string, 
            'hero' as SubscriptionSource,
            ckPayloadOptions
        );
        
        console.log(`[API Subscribe ${requestTimestamp}] Submitting to ConvertKit for ${email}.`);
        const convertKitSubmission = await submitToConvertKit(convertKitPayload, convertKitFormIdToUse);
        console.log(`[API Subscribe ${requestTimestamp}] ConvertKit submission response for ${email}:`, convertKitSubmission.success);

        if (!convertKitSubmission.success) {
          console.warn(`[API Subscribe ${requestTimestamp}] ConvertKit submission failed for ${email}. Status: ${convertKitSubmission.success}, Message: ${convertKitSubmission.error}`);
        } else {
          console.log(`[API Subscribe ${requestTimestamp}] ConvertKit submission to form ${convertKitFormIdToUse} successful for ${email}.`);
        }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Subscription pending. Please check your email to confirm.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API Subscribe ${requestTimestamp}] Outer error: ${errorMessage}`, error);
    return new Response(JSON.stringify({ message: 'An unexpected error occurred.', error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
