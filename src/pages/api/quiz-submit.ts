// src/pages/api/quiz-submit.ts
// IMPORTANT: This file is undergoing a major refactor to align with new A/B testing and email verification flow.

// import { createClient } from '@supabase/supabase-js'; // OLD - will be replaced by centralized operations
// import { Buffer } from 'node:buffer'; // For robust token generation - crypto.randomUUID is generally preferred now

// NEW IMPORTS from database-operations
import { 
  findOrCreateUserForVerification,
  generateAndStoreVerificationToken,
  updateRecord,
  callHandleQuizSubmissionRpc, // IMPORTED for actual RPC call
  stitchAnonymousUserToProfile // NEWLY IMPORTED for A/B data stitching
} from '~/lib/database-operations';
import type { 
  FindOrCreateUserResult, 
  GenerateTokenResult,
  HandleQuizSubmissionParams // IMPORTED for type safety
} from '~/lib/database-operations';

import { 
  createConvertKitPayload, 
  submitToConvertKit, 
  getConvertKitSubscriberByEmail,
  addTagToSubscriber,
  removeTagFromSubscriber,
  type FormSubscribePayload
} from '~/lib/convertkit-operations';

interface ClientVariantData {
  experimentName?: string;
  experimentId?: string;
  variantId: string;
  variantName: string;
  quizPath?: string;
  quizName?: string;
}

// OLD Supabase client init - REMOVED
// const supabaseUrl = import.meta.env.SUPABASE_URL;
// const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const convertKitApiKey = import.meta.env.CONVERTKIT_API_KEY;
const convertKitFormId = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID; // Keep for ConvertKit

// OLD Supabase client instance - REMOVED
// if (!supabaseUrl || !supabaseKey) {
//   console.error('CRITICAL: Missing Supabase URL or Service Role Key. Function will not work.');
//   throw new Error('Missing Supabase configuration');
// }
// const supabase = createClient(supabaseUrl, supabaseKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false
//   }
// });
// NEW: Supabase client is now managed within database-operations.ts

if (!convertKitApiKey || !convertKitFormId) {
  console.warn('[API Quiz Submit] Warning: Missing ConvertKit API Key or Form ID. ConvertKit integration will be skipped.');
}

export const POST = async ({ request, clientAddress }: { request: Request; clientAddress: string }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[API Quiz Submit ${requestTimestamp}] Received request from IP: ${clientAddress}`);
  
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const firstName = (formData.get('firstName') || formData.get('first_name'))?.toString().trim() || '';
    const scoreString = formData.get('score')?.toString();
    const resultType = formData.get('resultType')?.toString();
    const referralCodeUsedBySubmitter = formData.get('referrer_id')?.toString() || formData.get('referralCode')?.toString() || null;
    
    // A/B Testing & Context Data from Client
    const variantInfoString = formData.get('variantInfo')?.toString();
    const anonymousUserId = formData.get('anonymous_user_id')?.toString() || null; // The anonymous ID from client localStorage
    const browserIdentifier = formData.get('browser_identifier')?.toString() || null; // This is user_id from client localStorage (ab_user_id)
    const sessionIdentifier = formData.get('session_identifier')?.toString() || null;
    const pageUrlAtSubmission = formData.get('page_url_at_submission')?.toString() || request.headers.get('referer') || null;
    const clientSideImpressionId = formData.get('client_side_impression_id')?.toString() || null; // New field
    const deviceType = formData.get('device_type')?.toString() || 'unknown'; // New field

    console.log(`[API Quiz Submit ${requestTimestamp}] Form Data: email=${email}, firstName=${firstName}, score=${scoreString}, resultType=${resultType}, referralUsed=${referralCodeUsedBySubmitter}`);
    console.log(`[API Quiz Submit ${requestTimestamp}] A/B Context: variantInfoPresent=${!!variantInfoString}, anonymousId=${anonymousUserId}, sessionId=${sessionIdentifier}, pageUrl=${pageUrlAtSubmission}, clientImpressionId=${clientSideImpressionId}, deviceType=${deviceType}`);

    // Basic Validation
    if (!email || !email.includes('@')) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: Email invalid/missing. Email: ${email}`);
      return new Response(JSON.stringify({ success: false, message: 'Valid email is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!resultType) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: resultType missing.`);
      return new Response(JSON.stringify({ success: false, message: 'Quiz result is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // browserIdentifier is important for Rule 5 (returning user, new email), but not strictly blocking initial submission.
    // clientSideImpressionId is important for linking, but might be null if client-side impression was skipped (e.g., verified user).

    let parsedClientVariantData: ClientVariantData | null = null;
    if (variantInfoString) {
      try {
        const parsed = JSON.parse(variantInfoString);
        if (parsed.variantId && (parsed.experimentId || parsed.experimentName) && parsed.variantName) {
          parsedClientVariantData = {
            experimentName: parsed.experimentName || parsed.experiment, // experiment is legacy name from some client versions
            experimentId: parsed.experimentId,
            variantId: parsed.variantId,
            variantName: parsed.variantName,
            quizPath: parsed.quizPath,
            quizName: parsed.quizName || 'general'
          };
          console.log(`[API Quiz Submit ${requestTimestamp}] Parsed client variant data:`, parsedClientVariantData);
        } else {
          console.warn(`[API Quiz Submit ${requestTimestamp}] Variant info from client missing required fields (experimentId/experimentName, variantId, variantName):`, parsed);
        }
      } catch (e: unknown) {
        console.error(`[API Quiz Submit ${requestTimestamp}] Error parsing variant info JSON: ${(e instanceof Error ? e.message : String(e))}. Received: "${variantInfoString}"`);
      }
    }

    // TODO: If experimentId is null but experimentName is present, we'll need a DB call to get the experiment_id (UUID).
    // For now, proceeding under assumption client primarily sends experimentId (UUID) or it can be null.
    const actualExperimentUUID = parsedClientVariantData?.experimentId || null;
    const actualVariantUUID = parsedClientVariantData?.variantId || null;

    if (parsedClientVariantData && (!actualExperimentUUID || !actualVariantUUID)) {
        console.warn(`[API Quiz Submit ${requestTimestamp}] Missing actualExperimentUUID or actualVariantUUID from parsed client variant data. This will affect A/B linking. ExperimentID: ${actualExperimentUUID}, VariantID: ${actualVariantUUID}`);
    }

    const score = scoreString ? parseInt(scoreString, 10) : 0;

    console.log(`[API Quiz Submit ${requestTimestamp}] Processing email: ${email} with new user identification flow.`);

    const { 
      user: userProfileForSubmittedEmail, 
      isNewUser: isNewUserForSubmittedEmail,
      isAlreadyVerified: isAlreadyVerifiedForSubmittedEmail, 
      error: findOrCreateError 
    }: FindOrCreateUserResult = await findOrCreateUserForVerification(email);

    if (findOrCreateError || !userProfileForSubmittedEmail) {
      console.error(`[API Quiz Submit ${requestTimestamp}] Error finding or creating user for email ${email}:`, findOrCreateError || 'User profile was null');
      return new Response(JSON.stringify({ success: false, message: 'Error processing user data. Please try again.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    console.log(`[API Quiz Submit ${requestTimestamp}] User profile data for ${email}: ID=${userProfileForSubmittedEmail.id}, NewUser=${isNewUserForSubmittedEmail}, Verified=${isAlreadyVerifiedForSubmittedEmail}`);

    // --- A/B Test Data Stitching ---
    // If this is a new user and we have an anonymous ID from the client,
    // we need to "stitch" their anonymous impression history to their new user profile.
    if (isNewUserForSubmittedEmail && anonymousUserId) {
      console.log(`[API Quiz Submit ${requestTimestamp}] New user detected with anonymous ID. Stitching A/B data for user profile ${userProfileForSubmittedEmail.id} and anonymous ID ${anonymousUserId}.`);
      try {
        const stitchResult = await stitchAnonymousUserToProfile(userProfileForSubmittedEmail.id, anonymousUserId);
        if (stitchResult.success) {
          console.log(`[API Quiz Submit ${requestTimestamp}] Successfully stitched A/B data. Impressions updated: ${stitchResult.impressionsUpdated}, Participations updated: ${stitchResult.participationsUpdated}.`);
        } else {
          // Non-critical error. Log it but don't fail the request.
          console.error(`[API Quiz Submit ${requestTimestamp}] Failed to stitch A/B data for user ${userProfileForSubmittedEmail.id}. Error: ${stitchResult.error}`);
        }
      } catch (stitchError) {
        console.error(`[API Quiz Submit ${requestTimestamp}] Unexpected error during A/B data stitching for user ${userProfileForSubmittedEmail.id}:`, stitchError);
      }
    }

    // --- Impression & Token Logic --- 
    const impressionIdForTokenGeneration: string | null = clientSideImpressionId; // Default to client-side one if present
    let actionNeededForVerification = !isAlreadyVerifiedForSubmittedEmail; // If already verified, less action needed

    // Rule 4: If this email is already verified, no new token/verification needed.
    // Impression logging: An impression might have been logged on client if they weren't quiz-verified. 
    // If they were quiz-verified, client-side impression was skipped. This is fine.
    // No new server-side impression needed for this rule.
    if (isAlreadyVerifiedForSubmittedEmail) {
      console.log(`[API Quiz Submit ${requestTimestamp}] Email ${email} (User ID: ${userProfileForSubmittedEmail.id}) is already verified. No new verification token needed.`);
      actionNeededForVerification = false;
      // We will still proceed to save quiz results via RPC and update ConvertKit tags if necessary.
    }

    // Rule 5 is now deprecated. The client-side impression is the single source of truth.
    // The logic to handle a returning user with a new email is handled by findOrCreateUser,
    // and the client-side impression_id is what links the action back to the A/B test correctly.
    // Removing the block that attempted to create a second, server-side impression.

    if (actionNeededForVerification && !impressionIdForTokenGeneration) {
        console.warn(`[API Quiz Submit ${requestTimestamp}] No impression ID available for token generation (client-side was null/not provided). A/B conversion attribution might be incomplete for user ${userProfileForSubmittedEmail.id}.`);
    }

    console.log(`[API Quiz Submit ${requestTimestamp}] Impression ID for token generation: ${impressionIdForTokenGeneration}, Action for verification: ${actionNeededForVerification}`);

    // --- Token Generation (if needed) ---
    let verificationTokenForKit: string | null = null;
    if (actionNeededForVerification) {
      console.log(`[API Quiz Submit ${requestTimestamp}] Action needed for verification. Generating token for user ${userProfileForSubmittedEmail.id}, email ${email}.`);
      const tokenResult: GenerateTokenResult = await generateAndStoreVerificationToken(
        userProfileForSubmittedEmail.id,
        email,
        actualExperimentUUID, 
        actualVariantUUID,
        impressionIdForTokenGeneration 
      );

      if (tokenResult.error || !tokenResult.token) {
        console.error(`[API Quiz Submit ${requestTimestamp}] Error generating verification token for ${email}:`, tokenResult.error || 'No token returned');
        // Decide if this is a hard failure. For now, log and proceed without a token for Kit.
        // This means email verification link might not be sendable or work correctly.
        // Could return an error to the client:
        // return new Response(JSON.stringify({ success: false, message: 'Error preparing email verification. Please try again later.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      } else {
        verificationTokenForKit = tokenResult.token;
        console.log(`[API Quiz Submit ${requestTimestamp}] Verification token generated for ${email}: ${verificationTokenForKit}`);
      }
    } else {
      console.log(`[API Quiz Submit ${requestTimestamp}] No action needed for verification (email likely already verified or other condition). Skipping token generation.`);
    }

    // --- ConvertKit Integration --- 
    let kitSubscriberId: number | null = null;
    const EMAIL_VERIFIED_TAG_ID = 6400311; // Defined from existing code
    const EMAIL_NOT_VERIFIED_TAG_ID = 6400312; // Defined from existing code
    const quizResultTagName = resultType ? `quiz_result_${resultType.toLowerCase().replace(/\s+/g, '_')}` : null;
    
    if (quizResultTagName) {
      console.log(`[API Quiz Submit ${requestTimestamp}] Quiz result tag name determined as: ${quizResultTagName}. Actual ID needs to be mapped.`);
    }

    // Base options for ConvertKit payload
    const basePayloadOptions = {
      firstName: firstName || undefined,
      score: score,
      gems: score, // Gems are same as score
      resultType: resultType,
    };

    if (convertKitApiKey && convertKitFormId) {
      if (actionNeededForVerification) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Action for verification TRUE. Subscribing ${email} to ConvertKit with verification token.`);
        
        const customFieldsForNew: Record<string, string> = {
            quiz_name: parsedClientVariantData?.quizName || 'general',
            ...(verificationTokenForKit && { app_confirmation_token: verificationTokenForKit }),
            ...(userProfileForSubmittedEmail.action_token && { action_token: userProfileForSubmittedEmail.action_token }),
        };

        const optionsForNewUser = {...basePayloadOptions, customFields: customFieldsForNew};
        
        const payload: FormSubscribePayload = createConvertKitPayload(
          email,
          'quiz',
          optionsForNewUser
        );
        
        if (!payload.tags) payload.tags = [];
        payload.tags.push(EMAIL_NOT_VERIFIED_TAG_ID);

        try {
          const ckResponse = await submitToConvertKit(payload);
          console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission response for new subscription of ${email}:`, ckResponse);
          if (ckResponse.success) {
            // After successful submission, fetch the subscriber to get their ID
            const { data: subscriberData } = await getConvertKitSubscriberByEmail(email);
            if (subscriberData) {
              kitSubscriberId = subscriberData.id;
              console.log(`[API Quiz Submit ${requestTimestamp}] Successfully subscribed ${email} to ConvertKit, new CK ID: ${kitSubscriberId}. Updating user profile.`);
              await updateRecord('user_profiles', userProfileForSubmittedEmail.id, { kit_subscriber_id: String(kitSubscriberId) });
            } else {
              console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission for ${email} succeeded, but could not fetch subscriber data afterwards.`);
            }
          } else {
             console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission for ${email} did not succeed. Payload:`, payload);
          }
        } catch (error) {
          console.error(`[API Quiz Submit ${requestTimestamp}] Error submitting new subscriber ${email} to ConvertKit:`, error);
        }

      } else { // actionNeededForVerification is FALSE (email already verified or other no-action scenario)
        console.log(`[API Quiz Submit ${requestTimestamp}] Email ${email} already verified. Checking ConvertKit status.`);
        
        const { success: fetchSuccess, data: subscriberData } = await getConvertKitSubscriberByEmail(email);

        if (fetchSuccess && subscriberData) {
          kitSubscriberId = subscriberData.id;
          console.log(`[API Quiz Submit ${requestTimestamp}] Found existing ConvertKit subscriber for ${email}. CK ID: ${kitSubscriberId}. Ensuring tags are correct.`);

          // Ensure our database has the correct ID
          if (String(kitSubscriberId) !== userProfileForSubmittedEmail.kit_subscriber_id) {
            console.log(`[API Quiz Submit ${requestTimestamp}] Updating user profile ${userProfileForSubmittedEmail.id} with correct Kit ID ${kitSubscriberId}.`);
            await updateRecord('user_profiles', userProfileForSubmittedEmail.id, { kit_subscriber_id: String(kitSubscriberId) });
          }
          
          // Since we cannot get tag information directly from the subscriber object,
          // we will just re-apply the correct tags. This is idempotent.
          console.log(`[API Quiz Submit ${requestTimestamp}] Re-applying 'Email Verified' tag and removing 'Email Not Verified' tag for subscriber ${kitSubscriberId}.`);
          await addTagToSubscriber(email, EMAIL_VERIFIED_TAG_ID);
          await removeTagFromSubscriber(email, EMAIL_NOT_VERIFIED_TAG_ID);

          // TODO: Add quiz result tag once mapping from name to ID is available.

        } else {
          // This case is tricky. The user is verified in our DB, but not in ConvertKit.
          // This could happen if they were manually added or deleted from CK.
          // We should re-subscribe them.
          console.warn(`[API Quiz Submit ${requestTimestamp}] User ${email} is verified locally but not found in ConvertKit. Re-subscribing.`);
          
          const optionsForVerifiedUser = { ...basePayloadOptions, customFields: {
             ...(userProfileForSubmittedEmail.action_token && { action_token: userProfileForSubmittedEmail.action_token }),
          }};
          
          const payload: FormSubscribePayload = createConvertKitPayload(
            email,
            'quiz',
            optionsForVerifiedUser
          );
          
          if (!payload.tags) payload.tags = [];
          payload.tags.push(EMAIL_VERIFIED_TAG_ID); // They are verified, so use the verified tag

          try {
            const ckResponse = await submitToConvertKit(payload);
            console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit re-submission response for ${email}:`, ckResponse);
            if (ckResponse.success) {
              const { data: subscriberData } = await getConvertKitSubscriberByEmail(email);
              if (subscriberData) {
                kitSubscriberId = subscriberData.id;
                console.log(`[API Quiz Submit ${requestTimestamp}] Successfully re-subscribed ${email} to ConvertKit, new CK ID: ${kitSubscriberId}. Updating user profile.`);
                await updateRecord('user_profiles', userProfileForSubmittedEmail.id, { kit_subscriber_id: String(kitSubscriberId) });
              }
            }
          } catch (error) {
            console.error(`[API Quiz Submit ${requestTimestamp}] Error re-subscribing verified user ${email} to ConvertKit:`, error);
          }
        }
      }
    } else {
      console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit API Key or Form ID missing. Skipping ConvertKit integration for ${email}.`);
    }

    // --- Call Supabase RPC to handle quiz submission, including A/B results, referrals, etc. ---
    console.log(`[API Quiz Submit ${requestTimestamp}] Preparing to call handle_quiz_submission RPC for user ${userProfileForSubmittedEmail.id}`);
    let rpcSuccess = false;
    let rpcMessage = "RPC call skipped or failed.";
    let referral_code_generated: string | null = userProfileForSubmittedEmail.referral_code ?? null; // Default to existing or null
    let insight_gems_updated: number | null = userProfileForSubmittedEmail.insight_gems ?? null; // Default to existing or null

    try {
      const rpcCallParams: HandleQuizSubmissionParams = {
        user_profile_id: userProfileForSubmittedEmail.id,
        emailAddress: email,
        userFirstName: firstName || null,
        quizScore: score,
        quizResultType: resultType, // resultType is validated to exist earlier
        quizNameTaken: parsedClientVariantData?.quizName || 'general',
        experimentIdAssociated: actualExperimentUUID,
        variantIdAssociated: actualVariantUUID,
        impressionIdToLink: impressionIdForTokenGeneration,
        referralCodeAttempted: referralCodeUsedBySubmitter,
        ipAddress: clientAddress,
        browserId: browserIdentifier,
        sessionId: sessionIdentifier,
        clientDeviceType: deviceType,
        submissionPageUrl: pageUrlAtSubmission,
      };

      console.log(`[API Quiz Submit ${requestTimestamp}] Calling handle_quiz_submission with params:`, rpcCallParams);
      const { data: rpcData, error: rpcError } = await callHandleQuizSubmissionRpc(rpcCallParams);

      if (rpcError) {
        console.error(`[API Quiz Submit ${requestTimestamp}] RPC handle_quiz_submission failed for ${email}:`, rpcError.message);
        rpcMessage = `Error processing quiz submission details: ${rpcError.message}`;
        // rpcSuccess remains false
      } else if (rpcData && rpcData.success) {
        rpcSuccess = true;
        rpcMessage = rpcData.message || "Quiz submission processed successfully by RPC.";
        referral_code_generated = rpcData.referral_code !== undefined ? rpcData.referral_code : referral_code_generated;
        insight_gems_updated = rpcData.insight_gems !== undefined ? rpcData.insight_gems : insight_gems_updated;
        console.log(`[API Quiz Submit ${requestTimestamp}] RPC handle_quiz_submission successful for ${email}. Generated referral: ${referral_code_generated}, Updated gems: ${insight_gems_updated}`);
      } else {
        // Handles cases where rpcData is null or rpcData.success is false
        rpcMessage = rpcData?.message || "RPC call did not indicate success or returned unexpected data.";
        console.warn(`[API Quiz Submit ${requestTimestamp}] RPC handle_quiz_submission for ${email} did not return success or data:`, rpcData);
        // rpcSuccess remains false
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[API Quiz Submit ${requestTimestamp}] Exception during RPC call for ${email}: ${errorMessage}`);
      rpcMessage = `Exception during quiz submission processing: ${errorMessage}`;
    }

    console.log(`[API Quiz Submit ${requestTimestamp}] Finalizing response for ${email}. RPC Success: ${rpcSuccess}, Kit ID: ${kitSubscriberId}`);

    // --- After successful quiz submission and before returning response, insert conversion record ---
    // Determine eligibility (reuse or call eligibility logic if needed)
    // Removed unused conversionEligibilityVerified variable and related comment

    return new Response(JSON.stringify({
      success: rpcSuccess, // Overall success now tied to RPC outcome primarily
      message: rpcMessage,
      userId: userProfileForSubmittedEmail.id,
      isNewUser: isNewUserForSubmittedEmail,
      emailVerified: !actionNeededForVerification, // If action was needed, they are not yet verified
      verificationTokenSent: actionNeededForVerification && !!verificationTokenForKit,
      kitStatus: {
        subscribed: !!kitSubscriberId,
        subscriberId: kitSubscriberId,
        actionTaken: actionNeededForVerification ? 'new_subscription_attempted' : 'existing_subscriber_updated'
      },
      referralCode: referral_code_generated,
      insightGems: insight_gems_updated,
      // experimentDetails: { // Optionally include for debugging or client-side confirmation
      //   experimentId: actualExperimentUUID,
      //   variantId: actualVariantUUID,
      //   impressionId: impressionIdForTokenGeneration
      // }
    }), {
      status: rpcSuccess ? 200 : (findOrCreateError || !userProfileForSubmittedEmail ? 500 : 207), // 207 Multi-Status if RPC failed but user/kit part might be ok
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    let errorMessage = 'An unexpected server error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`[API Quiz Submit ${requestTimestamp}] Unhandled exception: ${errorMessage}`, error); 
    return new Response(JSON.stringify({ success: false, message: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
