// src/pages/api/quiz-submit.ts
import { createClient } from '@supabase/supabase-js';
import { createConvertKitPayload, submitToConvertKit, type ConvertKitSubscribePayload, type SubscriptionSource } from '~/lib/convertkit-config';
import { Buffer } from 'node:buffer'; // For robust token generation

interface VariantData {
  experiment: string; // This is the experiment NAME from client
  variantId: string;
  variantName: string;
  quizPath?: string;
  quizName?: string;
}

// For token generation
function generateSecureToken(length = 32) {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Buffer.from(randomBytes).toString('hex');
}

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const convertKitApiKey = import.meta.env.CONVERTKIT_API_KEY;
const convertKitFormId = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Missing Supabase URL or Service Role Key. Function will not work.');
  throw new Error('Missing Supabase configuration');
}

if (!convertKitApiKey || !convertKitFormId) {
  console.warn('Warning: Missing ConvertKit API Key or Form ID. ConvertKit integration will be skipped.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
    const variantInfoString = formData.get('variantInfo')?.toString();
    
    // A/B Testing Context from Client
    const browserIdentifier = formData.get('browser_identifier')?.toString() || null;
    const sessionIdentifier = formData.get('session_identifier')?.toString() || null;
    const originalExposureTimestampString = formData.get('original_exposure_timestamp')?.toString() || null;
    const pageUrlAtSubmission = formData.get('page_url_at_submission')?.toString() || request.headers.get('referer') || null;


    console.log(`[API Quiz Submit ${requestTimestamp}] Form Data: email=${email}, firstName=${firstName}, score=${scoreString}, resultType=${resultType}, referralUsed=${referralCodeUsedBySubmitter}, variantInfoPresent=${!!variantInfoString}`);
    console.log(`[API Quiz Submit ${requestTimestamp}] A/B Context: browserId=${browserIdentifier}, sessionId=${sessionIdentifier}, exposureTs=${originalExposureTimestampString}, pageUrl=${pageUrlAtSubmission}`);


    let parsedVariantData: VariantData | null = null; 
    if (variantInfoString) {
      try {
        const parsed = JSON.parse(variantInfoString);
        if (parsed.experiment && parsed.variantId && parsed.variantName) {
          parsedVariantData = { 
            experiment: parsed.experiment, 
            variantId: parsed.variantId,
            variantName: parsed.variantName,
            quizPath: parsed.quizPath,
            quizName: parsed.quizName
          };
          console.log(`[API Quiz Submit ${requestTimestamp}] Parsed variant data from client:`, parsedVariantData);
        } else {
          console.warn(`[API Quiz Submit ${requestTimestamp}] Variant info from client missing required fields:`, parsed);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[API Quiz Submit ${requestTimestamp}] Error parsing variant info JSON: ${errorMessage}. Received: "${variantInfoString}"`);
      }
    } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] No variantInfo string in form data.`);
    }

    if (!email || !email.includes('@')) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: Email invalid/missing. Email: ${email}`);
      return new Response(JSON.stringify({ success: false, message: 'Valid email is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!resultType) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: resultType missing.`);
      return new Response(JSON.stringify({ success: false, message: 'Quiz result is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
     if (!browserIdentifier) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: browser_identifier missing. This is crucial for A/B tracking.`);
      // Decide if this is a hard fail or allow submission with warning
      // For now, allowing with a warning, but this compromises A/B tracking accuracy if missing.
    }


    let score = 0;
    if (scoreString) {
        const parsedScore = parseInt(scoreString);
        if (!isNaN(parsedScore)) {
            score = parsedScore;
        } else {
            console.warn(`[API Quiz Submit ${requestTimestamp}] Score "${scoreString}" not parsable. Defaulting to 0.`);
        }
    } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] No score string. Defaulting score to 0.`);
    }
    
    const originalExposureTimestamp = originalExposureTimestampString ? new Date(Date.now()).toISOString() : null;


    // Main try-catch for DB ops and ConvertKit
    try {
      console.log(`[API Quiz Submit ${requestTimestamp}] Looking up user: ${email}`);
      const { data: existingUser, error: userLookupError } = await supabase
        .from('user_profiles')
        .select('id, email, insight_gems, referral_code')
        .eq('email', email)
        .maybeSingle();

      if (userLookupError) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error looking up user ${email}: ${userLookupError.message}`);
        throw userLookupError; 
      }

      let userId: string;
      let userOwnReferralCode: string; 
      let currentInsightGems: number = 0;
      let isNewUser = false;

      if (existingUser) {
        userId = existingUser.id;
        userOwnReferralCode = existingUser.referral_code || ''; 
        currentInsightGems = existingUser.insight_gems || 0;
        console.log(`[API Quiz Submit ${requestTimestamp}] Existing user: ID ${userId}, Gems ${currentInsightGems}, Own Referral ${userOwnReferralCode}`);
      } else {
        isNewUser = true;
        const newUserId = globalThis.crypto.randomUUID(); // Standard UUID generation
        const newUserOwnReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        currentInsightGems = 100; 
        
        console.log(`[API Quiz Submit ${requestTimestamp}] Creating new user: ${email}, ID ${newUserId}, Own Referral ${newUserOwnReferralCode}. Initial gems will be set to 100 by DB default.`);
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({ id: newUserId, email, first_name: firstName, referral_code: newUserOwnReferralCode });

        if (insertError) {
          console.error(`[API Quiz Submit ${requestTimestamp}] DB error creating user ${email}: ${insertError.message}`);
          throw insertError;
        }
        userId = newUserId;
        userOwnReferralCode = newUserOwnReferralCode;
        console.log(`[API Quiz Submit ${requestTimestamp}] New user created: ID ${userId}`);
      }

      // --- Pending Email Confirmation Logic ---
      let actualExperimentUUID: string | null = null;
      if (parsedVariantData && parsedVariantData.experiment) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Looking up experiment ID for name: "${parsedVariantData.experiment}"`);
        const { data: experimentRecord, error: expError } = await supabase
          .from('experiments')
          .select('id') 
          .eq('name', parsedVariantData.experiment) 
          .maybeSingle(); 

        if (expError) {
          console.error(`[API Quiz Submit ${requestTimestamp}] DB error fetching experiment ID for "${parsedVariantData.experiment}": ${expError.message}`);
        } else if (experimentRecord && experimentRecord.id) {
          actualExperimentUUID = experimentRecord.id;
          console.log(`[API Quiz Submit ${requestTimestamp}] Found experiment ID: ${actualExperimentUUID} for name "${parsedVariantData.experiment}"`);
        } else {
          console.warn(`[API Quiz Submit ${requestTimestamp}] No experiment in 'experiments' table for name: "${parsedVariantData.experiment}". Pending confirmation will not have experiment context.`);
        }
      } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] No client variant data/experiment name to look up experiment ID for pending confirmation.`);
      }

      const confirmationToken = generateSecureToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      const submissionDetails = {
        quiz_score: score,
        quiz_result_type: resultType,
        referral_code_used: referralCodeUsedBySubmitter,
        client_variant_name: parsedVariantData?.variantName || 'unknown',
        client_experiment_name: parsedVariantData?.experiment || 'unknown',
        client_quiz_path: parsedVariantData?.quizPath,
        client_quiz_name: parsedVariantData?.quizName,
        page_url_at_submission: pageUrlAtSubmission,
        user_agent: request.headers.get('user-agent'),
        ip_address: clientAddress,
        form_source: 'quiz-submit'
      };
      
      console.log(`[API Quiz Submit ${requestTimestamp}] Preparing to insert into pending_email_confirmations. Token: ${confirmationToken}, Email: ${email}`);
      const { error: pendingConfirmationError } = await supabase
        .from('pending_email_confirmations')
        .insert({
          email: email,
          confirmation_token: confirmationToken,
          variant_id: parsedVariantData?.variantId || null,
          experiment_id: actualExperimentUUID, // Can be null if experiment not found
          browser_identifier: browserIdentifier,
          session_identifier: sessionIdentifier,
          original_exposure_timestamp: originalExposureTimestamp,
          submission_details: submissionDetails,
          expires_at: tokenExpiry,
        });

      if (pendingConfirmationError) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error inserting into pending_email_confirmations: ${pendingConfirmationError.message}`);
        // Potentially return an error response here, but for now, let ConvertKit attempt proceed if user profile was handled
        // throw pendingConfirmationError; // Or handle more gracefully
      } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] Successfully inserted into pending_email_confirmations for email: ${email}`);
        // TODO: Trigger email sending with the confirmationToken
        // Example: await sendConfirmationEmail(email, firstName, confirmationToken);
        console.log(`[API Quiz Submit ${requestTimestamp}] ACTION NEEDED: Send confirmation email to ${email} with token ${confirmationToken}`);
      }
      // --- END OF Pending Email Confirmation Logic ---
      
      // The original A/B conversion tracking logic that directly inserted into 'conversions' table is now REMOVED.
      // Conversion will be tracked upon email confirmation via the new /api/confirm-email endpoint.

      console.log(`[API Quiz Submit ${requestTimestamp}] Calling RPC handle_quiz_submission for user ${userId}, email ${email}, score ${score}, result ${resultType}, referralUsed ${referralCodeUsedBySubmitter}`);
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('handle_quiz_submission', {
          p_user_id: userId,
          p_email: email, 
          p_quiz_score: score,
          p_quiz_result: resultType,
          p_referral_code: referralCodeUsedBySubmitter 
        });

      if (rpcError) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error calling RPC handle_quiz_submission for user ${userId}: ${rpcError.message}`);
        throw rpcError;
      }
      console.log(`[API Quiz Submit ${requestTimestamp}] RPC handle_quiz_submission OK for user ${userId}. RPC Data:`, rpcData);

      console.log(`[API Quiz Submit ${requestTimestamp}] Fetching final user data for user ${userId} after RPC.`);
      const { data: finalUserData, error: fetchFinalUserError } = await supabase
        .from('user_profiles')
        .select('insight_gems, referral_code')
        .eq('id', userId)
        .single();
      
      let gemsEarnedThisSession = 0;

      if (fetchFinalUserError || !finalUserData) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error fetching final user data for user ${userId}: ${fetchFinalUserError?.message || 'User data not found'}. Using pre-RPC values for response.`);
        if (isNewUser) gemsEarnedThisSession = 100; 
      } else {
        const gemsBeforeRPC = currentInsightGems; 
        currentInsightGems = finalUserData.insight_gems || 0;
        userOwnReferralCode = finalUserData.referral_code || userOwnReferralCode; 
        
        if (isNewUser) {
          gemsEarnedThisSession = currentInsightGems; 
        } else {
          gemsEarnedThisSession = currentInsightGems - gemsBeforeRPC;
        }
        console.log(`[API Quiz Submit ${requestTimestamp}] Final user data: Gems ${currentInsightGems}, Own Referral ${userOwnReferralCode}. Gems earned this session: ${gemsEarnedThisSession}`);
      }

      let quizSource: SubscriptionSource = 'quiz'; // Default to 'quiz' which is a valid SubscriptionSource
      if (parsedVariantData?.quizPath?.includes('lovelab') || parsedVariantData?.quizName?.toLowerCase().includes('love lab')) {
          quizSource = 'quiz-lovelab';
      } else if (parsedVariantData?.quizName) {
          // Ensure this assignment is also a valid SubscriptionSource or handle appropriately
          const potentialSource = parsedVariantData.quizName.toLowerCase().replace(/\s+/g, '-');
          if (potentialSource === 'hero' || potentialSource === 'quiz' || potentialSource === 'quiz-lovelab') {
            quizSource = potentialSource as SubscriptionSource;
          } else {
            // Fallback or specific handling if parsedVariantData.quizName doesn't map to a SubscriptionSource
            console.warn(`[API Quiz Submit ${requestTimestamp}] quizName "${parsedVariantData.quizName}" does not map to a valid SubscriptionSource. Defaulting to 'quiz'.`);
            quizSource = 'quiz';
          }
      }


      const ckPayloadOptions = {
        firstName: firstName,
        customFields: {
          quiz_score: score.toString(),
          quiz_result: resultType,
          referral_code: userOwnReferralCode, 
          gems_balance: currentInsightGems.toString(),
          last_quiz_score: score.toString(),
          last_quiz_result: resultType,
          last_quiz_date: new Date().toISOString().split('T')[0],
          quiz_signup_source: quizSource,
          app_confirmation_token: confirmationToken,
        },
        score: score,
        gems: currentInsightGems,
        referralId: userOwnReferralCode,
        resultType: resultType,
      };

      const convertKitPayload: ConvertKitSubscribePayload = createConvertKitPayload(email, quizSource, ckPayloadOptions);
      
      let convertKitSubmission: { success: boolean; error?: string } | null = null;
      if (convertKitApiKey && convertKitFormId) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Submitting to ConvertKit for ${email}.`);
        convertKitSubmission = await submitToConvertKit(convertKitPayload, convertKitFormId);
        console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission response for ${email}:`, convertKitSubmission.success);
        if (!convertKitSubmission.success) {
          console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission failed for ${email}. Status: ${convertKitSubmission.success}, Message: ${convertKitSubmission.error}`);
        }
      } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] Skipping ConvertKit submission due to missing API key or Form ID.`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Quiz submitted. Please check your email to confirm your subscription.', // Updated message
        userId, 
        referralCode: userOwnReferralCode, 
        insightGems: currentInsightGems,
        gemsEarned: gemsEarnedThisSession,
        isNewUser,
        convertKitStatus: convertKitSubmission?.success ? 'SUCCESS' : (convertKitSubmission?.error ? 'ERROR' : 'SKIPPED')
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      console.error(`[API Quiz Submit ${requestTimestamp}] General DB/RPC Error for ${email}: ${errorMessage}`, dbError);
      return new Response(JSON.stringify({ success: false, message: 'Database operation failed.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API Quiz Submit ${requestTimestamp}] Outer catch error: ${errorMessage}`, error);
    return new Response(JSON.stringify({ success: false, message: 'Failed to process request.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
