// src/pages/api/quiz-submit.ts
import { createClient } from '@supabase/supabase-js';
import { createConvertKitPayload, submitToConvertKit } from '~/lib/convertkit-config';

interface VariantData {
  experiment: string; // This is the experiment NAME from client
  variantId: string;
  variantName: string;
  quizPath?: string;
  quizName?: string;
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

export const POST = async ({ request }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[API Quiz Submit ${requestTimestamp}] Received request.`);
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const firstName = (formData.get('firstName') || formData.get('first_name'))?.toString().trim() || '';
    const scoreString = formData.get('score')?.toString();
    const resultType = formData.get('resultType')?.toString();
    const referralCodeUsedBySubmitter = formData.get('referrer_id')?.toString() || formData.get('referralCode')?.toString() || null;
    const variantInfoString = formData.get('variantInfo')?.toString();
    const sessionIdFromClient = formData.get('session_identifier')?.toString() || null; // <<< READ SESSION ID
    
    console.log(`[API Quiz Submit ${requestTimestamp}] Form Data: email=${email}, firstName=${firstName}, score=${scoreString}, resultType=${resultType}, referralUsed=${referralCodeUsedBySubmitter}, variantInfoPresent=${!!variantInfoString}, sessionId=${sessionIdFromClient}`);

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
      } catch (e) {
        console.error(`[API Quiz Submit ${requestTimestamp}] Error parsing variant info JSON: ${e.message}. Received: "${variantInfoString}"`);
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
        const newUserId = crypto.randomUUID();
        const newUserOwnReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        // Initialize currentInsightGems to 100 for new users, this will be used by ConvertKit payload
        // The database will use its default of 100 because we are not specifying insight_gems in the insert
        currentInsightGems = 100; 
        
        console.log(`[API Quiz Submit ${requestTimestamp}] Creating new user: ${email}, ID ${newUserId}, Own Referral ${newUserOwnReferralCode}. Initial gems will be set to 100 by DB default.`);
        // Remove insight_gems from insert to let DB default (100) apply
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

      // --- A/B CONVERSION TRACKING ---
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
          console.warn(`[API Quiz Submit ${requestTimestamp}] No experiment in 'experiments' table for name: "${parsedVariantData.experiment}".`);
        }
      } else {
        console.log(`[API Quiz Submit ${requestTimestamp}] No client variant data/experiment name to look up experiment ID.`);
      }

      if (actualExperimentUUID && parsedVariantData && parsedVariantData.variantId) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Checking for existing conversions: expUUID=${actualExperimentUUID}, email=${email}`);
        
        // Check for existing conversion by this email for this experiment (regardless of variant)
        const { data: existingConversion, error: conversionCheckError } = await supabase
          .from('conversions')
          .select('id, variant_id')
          .eq('experiment_id', actualExperimentUUID)
          .eq('user_identifier', email)
          .eq('conversion_type', 'quiz_completion')
          .maybeSingle();

        if (conversionCheckError && conversionCheckError.code !== 'PGRST116') {
          console.error(`[API Quiz Submit ${requestTimestamp}] DB error checking existing conversions: ${conversionCheckError.message}`);
        } else if (existingConversion) {
          console.log(`[API Quiz Submit ${requestTimestamp}] Conversion already exists for email ${email} in experiment ${actualExperimentUUID}. Skipping duplicate conversion to maintain data integrity.`);
        } else {
          // MODIFIED: Skip eligibility checks for quiz submissions to allow unlimited retaking
          // The quiz experience should be frictionless and allow different email submissions
          console.log(`[API Quiz Submit ${requestTimestamp}] Tracking new quiz conversion: expUUID=${actualExperimentUUID}, varID=${parsedVariantData.variantId}, email=${email}, session=${sessionIdFromClient}`);
          console.log(`[API Quiz Submit ${requestTimestamp}] Note: Skipping eligibility restrictions for quiz submissions to enable unlimited retaking with different emails`);
          
          const { error: conversionError } = await supabase
            .from('conversions')
            .insert({
              experiment_id: actualExperimentUUID, 
              variant_id: parsedVariantData.variantId, 
              user_identifier: email, 
              conversion_type: 'quiz_completion',
              session_identifier: sessionIdFromClient,
              conversion_eligibility_verified: true, // Set as verified since we're allowing quiz retaking
              details: {
                quiz_score: score,
                quiz_result: resultType,
                referral_code_used: referralCodeUsedBySubmitter,
                variant_name: parsedVariantData.variantName || 'unknown',
                original_experiment_name: parsedVariantData.experiment,
                submission_type: 'quiz_unlimited_retaking_enabled'
              }
            });
          if (conversionError) {
            console.error(`[API Quiz Submit ${requestTimestamp}] DB error tracking conversion: ${conversionError.message}. Details: ${conversionError.details}`);
          } else {
            console.log(`[API Quiz Submit ${requestTimestamp}] Quiz conversion tracked successfully (eligibility checks bypassed for unlimited retaking).`);
          }
        }
      } else {
        let reason = "Reason not determined.";
        if (!actualExperimentUUID && parsedVariantData && parsedVariantData.experiment) reason = `Exp. ID (UUID) not found for name "${parsedVariantData.experiment}".`;
        else if (!parsedVariantData || !parsedVariantData.variantId) reason = "Client variant data or variantId missing.";
        else if (!actualExperimentUUID) reason = "Exp. UUID not determined (e.g., name not found).";
        console.log(`[API Quiz Submit ${requestTimestamp}] Skipping conversion tracking. ${reason}`);
        if(parsedVariantData) console.log(`[API Quiz Submit ${requestTimestamp}] Client variant data at conversion decision:`, parsedVariantData);
      }
      // --- END OF A/B CONVERSION TRACKING ---

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

      // Re-fetch user data to get updated gems and confirm referral code after RPC
      console.log(`[API Quiz Submit ${requestTimestamp}] Fetching final user data for user ${userId} after RPC.`);
      const { data: finalUserData, error: fetchFinalUserError } = await supabase
        .from('user_profiles')
        .select('insight_gems, referral_code')
        .eq('id', userId)
        .single();
      
      let gemsEarnedThisSession = 0; // Default, will be calculated

      if (fetchFinalUserError || !finalUserData) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error fetching final user data for user ${userId}: ${fetchFinalUserError?.message || 'User data not found'}. Using pre-RPC values for response.`);
        // For response, userOwnReferralCode and currentInsightGems from before RPC will be used.
        // gemsEarnedThisSession will be based on the default logic or remain 0 if !isNewUser.
        if (isNewUser) gemsEarnedThisSession = 100; // Assuming new users get 100 gems by default from RPC
      } else {
        const gemsBeforeRPC = currentInsightGems; // Gems value before RPC call (0 for new user)
        currentInsightGems = finalUserData.insight_gems; // Gems after RPC
        userOwnReferralCode = finalUserData.referral_code; // User's own code, possibly set/confirmed by RPC

        if (isNewUser) {
            gemsEarnedThisSession = currentInsightGems; // For new user, all current gems are "earned"
        } else {
            gemsEarnedThisSession = currentInsightGems - gemsBeforeRPC; // For existing user
        }
        if (gemsEarnedThisSession < 0) gemsEarnedThisSession = 0; // Should not happen, but safeguard

        console.log(`[API Quiz Submit ${requestTimestamp}] Final user data for user ${userId}: Gems ${currentInsightGems}, Own Referral ${userOwnReferralCode}, Gems Earned This Session ${gemsEarnedThisSession}`);
      }
      
      // Default gems if calculation isn't specific enough / RPC doesn't return explicit amount
      // Your original code had a fixed 'gemsEarned: 100'. If that's intended, override calculation:
      // gemsEarnedThisSession = 100; 


      // Add user to ConvertKit using unified system
      if (convertKitApiKey && convertKitFormId) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Adding/updating in ConvertKit: ${email}`);
        try {
          // Determine quiz source based on the quiz type/path
          const quizSource = parsedVariantData?.quizName === 'love-lab' || 
                           parsedVariantData?.quizPath?.includes('love-lab') ? 
                           'quiz-lovelab' : 'quiz';
          
          // Create ConvertKit payload with unified tagging
          const convertKitPayload = createConvertKitPayload(email, quizSource, {
            firstName: firstName,
            resultType: resultType,
            score: score,
            gems: currentInsightGems,
            referralId: userOwnReferralCode,
            customFields: {
              // Add any additional custom fields specific to this quiz
              quiz_version: parsedVariantData?.variantName || 'default',
              experiment_name: parsedVariantData?.experiment || 'none',
            }
          });

          console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit payload:`, JSON.stringify(convertKitPayload, null, 2));

          // Submit to ConvertKit using the helper function
          const ckResult = await submitToConvertKit(convertKitPayload, convertKitFormId);
          
          if (!ckResult.success) {
            console.error(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission failed for ${email}: ${ckResult.error}`);
          } else {
            console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit submission successful for ${email} with source: ${quizSource}`);
          }
        } catch (ckError) {
          console.error(`[API Quiz Submit ${requestTimestamp}] Error during ConvertKit submission for ${email}: ${ckError.message}`);
        }
      } else {
        console.warn(`[API Quiz Submit ${requestTimestamp}] ConvertKit not configured. Skipping for ${email}.`);
      }

      console.log(`[API Quiz Submit ${requestTimestamp}] Submission for ${email} processed. Sending success response.`);
      return new Response(
        JSON.stringify({ 
          success: true,
          userId,
          gemsEarned: gemsEarnedThisSession, 
          totalGems: currentInsightGems, 
          referralCode: userOwnReferralCode, 
          message: 'Quiz submitted successfully' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (dbOrLogicError) { 
      console.error(`[API Quiz Submit ${requestTimestamp}] Error in main logic for ${email || 'N/A'}: ${dbOrLogicError.message}`, dbOrLogicError.stack);
      return new Response( JSON.stringify({ success: false, message: 'Server error processing submission' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (initialError) { 
    console.error(`[API Quiz Submit ${requestTimestamp}] Initial request processing error: ${initialError.message}`, initialError.stack);
    return new Response( JSON.stringify({ success: false, message: 'Error processing request' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
