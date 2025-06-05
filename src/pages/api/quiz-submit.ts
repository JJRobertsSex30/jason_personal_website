// src/pages/api/quiz-submit.ts
// IMPORTANT: This file is undergoing a major refactor to align with new A/B testing and email verification flow.

// import { createClient } from '@supabase/supabase-js'; // OLD - will be replaced by centralized operations
// import { Buffer } from 'node:buffer'; // For robust token generation - crypto.randomUUID is generally preferred now

// NEW IMPORTS from database-operations
import { 
  findOrCreateUserForVerification,
  generateAndStoreVerificationToken,
  logHeroImpression, // Assuming we use this, or a new logQuizImpression if more specific metadata needed
  updateRecord, // ADDED for updating kit_subscriber_id
  getRecordById, // Import if needed for Rule 5, or ensure it's part of the dynamic import resolution
  callHandleQuizSubmissionRpc // IMPORTED for actual RPC call
} from '~/lib/database-operations';
import type { 
  FindOrCreateUserResult, 
  GenerateTokenResult, 
  ImpressionData, // For logHeroImpression
  UserProfile,
  HandleQuizSubmissionParams // IMPORTED for type safety
  // SingleResult // REMOVED UNUSED IMPORT
} from '~/lib/database-operations';

import { 
  createConvertKitPayload, 
  submitToConvertKit, 
  getConvertKitSubscriberByEmail, // ADDED
  addTagToSubscriber, // ADDED
  removeTagFromSubscriber, // ADDED
  type ConvertKitSubscribePayload, 
  type SubscriptionSource, // This is a string literal union
  type ConvertKitSubscriber // ADDED
} from '~/lib/convertkit-config'; // Keep ConvertKit logic

interface ClientVariantData { // Renamed to distinguish from any potential server-side VariantData type
  experimentName?: string;   // Experiment NAME from client (may need mapping to UUID if experimentId is not sent)
  experimentId?: string;    // Experiment UUID from client (preferred)
  variantId: string;        // Variant UUID from client (this should always be a UUID)
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
    const browserIdentifier = formData.get('browser_identifier')?.toString() || null; // This is user_identifier from client localStorage (ab_user_identifier)
    const sessionIdentifier = formData.get('session_identifier')?.toString() || null;
    const pageUrlAtSubmission = formData.get('page_url_at_submission')?.toString() || request.headers.get('referer') || null;
    const clientSideImpressionId = formData.get('client_side_impression_id')?.toString() || null; // New field
    const deviceType = formData.get('device_type')?.toString() || 'unknown'; // New field

    console.log(`[API Quiz Submit ${requestTimestamp}] Form Data: email=${email}, firstName=${firstName}, score=${scoreString}, resultType=${resultType}, referralUsed=${referralCodeUsedBySubmitter}`);
    console.log(`[API Quiz Submit ${requestTimestamp}] A/B Context: variantInfoPresent=${!!variantInfoString}, browserId=${browserIdentifier}, sessionId=${sessionIdentifier}, pageUrl=${pageUrlAtSubmission}, clientImpressionId=${clientSideImpressionId}, deviceType=${deviceType}`);

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

    let score = 0;
    if (scoreString) {
        const parsedScore = parseInt(scoreString);
        score = !isNaN(parsedScore) ? parsedScore : 0;
        if (isNaN(parsedScore)) {
            console.warn(`[API Quiz Submit ${requestTimestamp}] Score "${scoreString}" not parsable. Defaulting to 0.`);
        }
    } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] No score string in form data. Defaulting score to 0.`);
    }

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

    // --- Impression & Token Logic --- 
    let impressionIdForTokenGeneration: string | null = clientSideImpressionId; // Default to client-side one if present
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

    // Rule 5: Returning user (known browserIdentifier) submitting a NEW email address.
    // This requires a NEW server-side impression linked to the NEW email's user profile.
    if (actionNeededForVerification && browserIdentifier && browserIdentifier !== userProfileForSubmittedEmail.id) {
      // Fetch the user profile associated with the browserIdentifier (their *previous* identity)
      // This dynamic import is a workaround if getRecordById is not directly available or causes circular deps
      // Ideally, getRecordById would be imported directly if database-operations.ts is structured for it.
      // const { getRecordById } = await import('~/lib/database-operations');  // REMOVED DYNAMIC IMPORT
      const { data: profileForBrowserId, error: fetchError } = await getRecordById('user_profiles', browserIdentifier);

      if (fetchError) {
        console.warn(`[API Quiz Submit ${requestTimestamp}] Error fetching profile for browserIdentifier ${browserIdentifier}:`, fetchError.message);
      }
      
      if (profileForBrowserId && (profileForBrowserId as UserProfile).email !== email) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Rule 5: Detected returning user (browserId: ${browserIdentifier}, their old email: ${(profileForBrowserId as UserProfile).email}) submitting a new email: ${email}.`);
        
        if (!actualExperimentUUID || !actualVariantUUID) {
            console.warn(`[API Quiz Submit ${requestTimestamp}] Cannot log server-side impression for Rule 5 due to missing experiment/variant UUIDs.`);
        } else {
            const impressionDetailsForRule5: ImpressionData = {
                experiment_id: actualExperimentUUID,
                variant_id: actualVariantUUID,
                user_identifier: userProfileForSubmittedEmail.id, // CRITICAL: Link to the NEW email's user profile ID
                page_url: pageUrlAtSubmission || undefined,
                session_identifier: sessionIdentifier || undefined,
                device_type: deviceType !== 'unknown' ? deviceType : undefined,
                metadata: {
                    source: 'quiz_submit_new_email_for_known_user',
                    original_browser_identifier: browserIdentifier,
                    client_side_impression_id_attempt: clientSideImpressionId, // Log if client tried to send one
                    quiz_name: parsedClientVariantData?.quizName || 'general'
                }
            };
            console.log(`[API Quiz Submit ${requestTimestamp}] Logging server-side impression for Rule 5:`, impressionDetailsForRule5);
            const {data: newImpression, error: impError } = await logHeroImpression(impressionDetailsForRule5);
            if (impError || !newImpression?.id) {
                console.warn(`[API Quiz Submit ${requestTimestamp}] Failed to log server-side impression for Rule 5:`, impError?.message || 'No ID returned');
            } else {
                console.log(`[API Quiz Submit ${requestTimestamp}] Server-side impression logged for Rule 5. New Impression ID: ${newImpression.id}`);
                impressionIdForTokenGeneration = newImpression.id; // This new impression ID takes precedence
            }
        }
      }
    }

    if (actionNeededForVerification && !impressionIdForTokenGeneration) {
        console.warn(`[API Quiz Submit ${requestTimestamp}] No impression ID available for token generation (client-side was null/not provided, and server-side not logged for Rule 5). A/B conversion attribution might be incomplete for user ${userProfileForSubmittedEmail.id}.`);
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
    const quizResultTagId: number | null = null; // CHANGED to const

    // TODO: In the future, quiz result tag IDs (like `TAG_ID_QUIZ_RESULT_TYPE_A`) should be dynamically fetched or stored in a config
    if (quizResultTagName) {
      console.log(`[API Quiz Submit ${requestTimestamp}] Quiz result tag name determined as: ${quizResultTagName}. Actual ID needs to be mapped.`);
    }

    const insightGems = score; // Assuming score (string from form) directly maps to insight_gems (string from form)
    const actualSource: SubscriptionSource = parsedClientVariantData?.quizName ? `Quiz: ${parsedClientVariantData.quizName}` as SubscriptionSource : "Quiz: General" as SubscriptionSource;

    // Base options for ConvertKit payload, parsed appropriately
    const basePayloadOptions = {
      firstName: firstName || undefined, // firstName from formData is string|undefined
      resultType: resultType || undefined, // resultType from formData is string|undefined
      score: score ? parseInt(score, 10) : undefined, // Parse score string to number
      gems: insightGems ? parseInt(insightGems, 10) : undefined, // Parse gems string to number
      // referralId: /* Get from formData if applicable, pass to options */,
    };

    if (convertKitApiKey && convertKitFormId) {
      if (actionNeededForVerification) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Action for verification TRUE. Subscribing ${email} to ConvertKit with verification token.`);
        
        const customFieldsForNew: Record<string, string> = {
            quiz_name: parsedClientVariantData?.quizName || 'general',
        };
        if (verificationTokenForKit) { // verificationTokenForKit is from generateAndStoreVerificationToken
            customFieldsForNew.app_confirmation_token = verificationTokenForKit; // Changed key to app_confirmation_token
        }
        const optionsForNewUser = {...basePayloadOptions, customFields: customFieldsForNew};
        
        const payload: ConvertKitSubscribePayload = createConvertKitPayload(
          email,
          actualSource,
          optionsForNewUser
        );
        
        if (!payload.tags) payload.tags = [];
        payload.tags.push(EMAIL_NOT_VERIFIED_TAG_ID);

        try {
          const ckResponse = await submitToConvertKit(payload, convertKitFormId);
          console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission response for new subscription of ${email}:`, ckResponse);
          if (ckResponse.success && (ckResponse as { subscription?: { subscriber?: { id?: number } } })?.subscription?.subscriber?.id) { 
            kitSubscriberId = (ckResponse as unknown as { subscription: { subscriber: { id: number } } }).subscription.subscriber.id; // REFINED TYPE ASSERTION to unknown first
            console.log(`[API Quiz Submit ${requestTimestamp}] Successfully subscribed ${email} to ConvertKit, new CK ID: ${kitSubscriberId}. Updating user profile.`);
            await updateRecord('user_profiles', userProfileForSubmittedEmail.id, { kit_subscriber_id: String(kitSubscriberId) });
          } else {
             console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission for ${email} did not return subscriber ID. Payload:`, payload);
          }
        } catch (error) {
          console.error(`[API Quiz Submit ${requestTimestamp}] Error submitting new subscriber ${email} to ConvertKit:`, error);
        }

      } else { // actionNeededForVerification is FALSE (email already verified or other no-action scenario)
        console.log(`[API Quiz Submit ${requestTimestamp}] Action for verification FALSE for ${email}. Fetching existing CK subscriber to update tags/fields.`);
        try {
          const getSubResult = await getConvertKitSubscriberByEmail(email); // CORRECTED ARGUMENTS
          const existingSubscriber: ConvertKitSubscriber | null = (getSubResult.success && getSubResult.data) ? getSubResult.data : null; // CORRECTED ASSIGNMENT
          
          if (existingSubscriber?.id) {
            kitSubscriberId = existingSubscriber.id;
            console.log(`[API Quiz Submit ${requestTimestamp}] Found existing ConvertKit subscriber for ${email}, CK ID: ${kitSubscriberId}.`);

            // Ensure kit_subscriber_id is up-to-date in our DB
            if (userProfileForSubmittedEmail.kit_subscriber_id !== String(kitSubscriberId)) { // CORRECTED COMPARISON
                console.log(`[API Quiz Submit ${requestTimestamp}] Updating user_profiles.kit_subscriber_id for ${userProfileForSubmittedEmail.id} to ${String(kitSubscriberId)}`);
                await updateRecord('user_profiles', userProfileForSubmittedEmail.id, { kit_subscriber_id: String(kitSubscriberId) });
            }

            // Manage tags: Add EMAIL_VERIFIED_TAG_ID, remove EMAIL_NOT_VERIFIED_TAG_ID
            // Add current quiz result tag
            const tagsToAdd = [EMAIL_VERIFIED_TAG_ID];
            if (quizResultTagId) tagsToAdd.push(quizResultTagId);
            
            for (const tagId of tagsToAdd) {
              try {
                await addTagToSubscriber(String(kitSubscriberId), tagId, convertKitApiKey); // Revert to using convertKitApiKey
                console.log(`[API Quiz Submit ${requestTimestamp}] Added tag ${tagId} to CK subscriber ${kitSubscriberId}`);
              } catch (tagError) {
                console.error(`[API Quiz Submit ${requestTimestamp}] Error adding tag ${tagId} to CK subscriber ${kitSubscriberId}:`, tagError);
              }
            }
            
            try { // Remove "not verified" tag
              await removeTagFromSubscriber(String(kitSubscriberId), EMAIL_NOT_VERIFIED_TAG_ID); // ADJUSTED ARGUMENTS
              console.log(`[API Quiz Submit ${requestTimestamp}] Removed tag ${EMAIL_NOT_VERIFIED_TAG_ID} from CK subscriber ${kitSubscriberId}`);
            } catch (tagError) {
              console.error(`[API Quiz Submit ${requestTimestamp}] Error removing tag ${EMAIL_NOT_VERIFIED_TAG_ID} from CK subscriber ${kitSubscriberId}:`, tagError);
            }

            // Update custom fields by re-submitting (CK API v3 doesn't have a direct field update endpoint without re-subscribing)
             console.log(`[API Quiz Submit ${requestTimestamp}] Updating custom fields for existing subscriber ${email} (CK ID: ${kitSubscriberId})`);
            
            const customFieldsForUpdate: Record<string, string> = {
                quiz_name: parsedClientVariantData?.quizName || 'general',
            }; // No verification token for existing, verified users
            const optionsForUpdate = {...basePayloadOptions, customFields: customFieldsForUpdate};

            const updatePayload: ConvertKitSubscribePayload = createConvertKitPayload(
              email,
              actualSource, 
              optionsForUpdate
            );

            try {
              const ckUpdateResponse = await submitToConvertKit(updatePayload, convertKitFormId);
              console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit field update response for ${email}:`, ckUpdateResponse);
            } catch (error) {
              console.error(`[API Quiz Submit ${requestTimestamp}] Error updating custom fields for ${email} in ConvertKit:`, error);
            }

          } else {
            console.warn(`[API Quiz Submit ${requestTimestamp}] Email ${email} was marked as verified/no action, but no existing ConvertKit subscriber found. This might indicate an inconsistency.`);
            // Optionally, attempt to subscribe them as a new user here if that's desired fallback behavior.
            // For now, just logging.
          }
        } catch (error) {
          console.error(`[API Quiz Submit ${requestTimestamp}] Error handling existing ConvertKit subscriber for ${email}:`, error);
        }
      }
    } else {
      console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit API Key or Form ID missing. Skipping ConvertKit integration for ${email}.`);
    }

    // --- Call Supabase RPC to handle quiz submission, including A/B results, referrals, etc. ---
    console.log(`[API Quiz Submit ${requestTimestamp}] Preparing to call handle_quiz_submission RPC for user ${userProfileForSubmittedEmail.id}`);
    let rpcSuccess = false;
    let rpcMessage = "RPC call skipped or failed.";
    let referral_code_generated: string | null = userProfileForSubmittedEmail.referral_code; // Default to existing or null
    let insight_gems_updated: number | null = userProfileForSubmittedEmail.insight_gems; // Default to existing or null

    try {
      const rpcCallParams: HandleQuizSubmissionParams = {
        userId: userProfileForSubmittedEmail.id,
        emailAddress: email,
        userFirstName: firstName,
        quizScore: score,
        quizResultType: resultType!, // resultType is validated to exist earlier
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
