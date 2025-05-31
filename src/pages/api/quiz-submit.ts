// src/pages/api/quiz-submit.ts
import { createClient } from '@supabase/supabase-js';

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
  // For a production environment, you might want to ensure the function cannot even be invoked
  // or returns a clear "service unavailable" if critical configs are missing.
  throw new Error('Missing Supabase configuration');
}

if (!convertKitApiKey || !convertKitFormId) {
  console.warn('Warning: Missing ConvertKit API Key or Form ID. ConvertKit integration will be skipped.');
  // Depending on requirements, this might also be a critical error.
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
    // Note: For Edge Functions using the service_role_key, persistSession and autoRefreshToken
    // are generally not relevant as each invocation is stateless and uses the service key directly.
  }
});

export const POST = async ({ request }) => {
  console.log(`[${new Date().toISOString()}] Quiz submission received. Processing...`);
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const firstName = (formData.get('firstName') || formData.get('first_name'))?.toString().trim() || '';
    const scoreString = formData.get('score')?.toString();
    const resultType = formData.get('resultType')?.toString();
    // The 'referralCode' here is the code a user might have entered to indicate who referred them.
    // It's distinct from the user's own referral_code that they get after signing up.
    const referralCodeUsedBySubmitter = formData.get('referralCode')?.toString() || formData.get('referrer_id')?.toString() || null;
    
    const variantInfoString = formData.get('variantInfo')?.toString();
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
          console.log(`[${new Date().toISOString()}] Successfully parsed variant data from client:`, parsedVariantData);
        } else {
          console.warn(`[${new Date().toISOString()}] Variant info from client is missing required fields (experiment, variantId, or variantName):`, parsed);
        }
      } catch (e) {
        console.error(`[${new Date().toISOString()}] Error parsing variant info JSON from client: ${e.message}. Received string: "${variantInfoString}"`);
      }
    } else {
        console.log(`[${new Date().toISOString()}] No variantInfo string found in form data.`);
    }

    if (!email || !email.includes('@')) {
      console.warn(`[${new Date().toISOString()}] Validation failed: Email is invalid or missing. Received:`, { email });
      return new Response(
        JSON.stringify({ success: false, message: 'Valid email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!resultType) {
      console.warn(`[${new Date().toISOString()}] Validation failed: Quiz resultType is missing.`);
      return new Response(
        JSON.stringify({ success: false, message: 'Quiz result is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let score = 0;
    if (scoreString) {
        const parsedScore = parseInt(scoreString);
        if (!isNaN(parsedScore)) {
            score = parsedScore;
        } else {
            console.warn(`[${new Date().toISOString()}] Warning: Score "${scoreString}" could not be parsed to an integer. Defaulting to 0.`);
        }
    } else {
        console.log(`[${new Date().toISOString()}] No score string provided. Defaulting score to 0.`);
    }


    // Main try-catch for database operations and ConvertKit
    try {
      console.log(`[${new Date().toISOString()}] Looking up user profile for email: ${email}`);
      const { data: existingUser, error: userLookupError } = await supabase
        .from('user_profiles')
        .select('id, email, insight_gems, referral_code') // User's own referral code
        .eq('email', email)
        .maybeSingle();

      if (userLookupError) {
        console.error(`[${new Date().toISOString()}] Database error looking up user profile for ${email}: ${userLookupError.message}`);
        throw userLookupError; 
      }

      let userId: string;
      let userOwnReferralCode: string; // The user's own code they can share
      let currentInsightGems: number = 0;

      if (existingUser) {
        userId = existingUser.id;
        userOwnReferralCode = existingUser.referral_code || ''; 
        currentInsightGems = existingUser.insight_gems || 0;
        console.log(`[${new Date().toISOString()}] Existing user found: ID ${userId}, Email: ${email}, Gems: ${currentInsightGems}, Own Referral Code: ${userOwnReferralCode}`);
      } else {
        const newUserId = crypto.randomUUID();
        const newUserOwnReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        currentInsightGems = 0; // Will be updated by RPC or set to default if RPC doesn't handle new user gems
        
        console.log(`[${new Date().toISOString()}] Creating new user profile for email: ${email}, Assigning ID: ${newUserId}, Referral Code: ${newUserOwnReferralCode}`);
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: newUserId,
            email,
            first_name: firstName,
            referral_code: newUserOwnReferralCode,
            insight_gems: 0 // Initial gems, might be updated by RPC
          });

        if (insertError) {
          console.error(`[${new Date().toISOString()}] Database error creating new user profile for ${email}: ${insertError.message}`);
          throw insertError;
        }
        userId = newUserId;
        userOwnReferralCode = newUserOwnReferralCode;
        console.log(`[${new Date().toISOString()}] New user profile created successfully. ID: ${userId}`);
      }

      // --- A/B CONVERSION TRACKING ---
      let actualExperimentUUID: string | null = null; 

      if (parsedVariantData && parsedVariantData.experiment) {
        console.log(`[${new Date().toISOString()}] Looking up experiment ID for experiment name: "${parsedVariantData.experiment}"`);
        const { data: experimentRecord, error: expError } = await supabase
          .from('experiments')
          .select('id') 
          .eq('name', parsedVariantData.experiment) 
          .maybeSingle(); 

        if (expError) {
          console.error(`[${new Date().toISOString()}] Database error fetching experiment ID for name "${parsedVariantData.experiment}": ${expError.message}`);
        } else if (experimentRecord && experimentRecord.id) {
          actualExperimentUUID = experimentRecord.id;
          console.log(`[${new Date().toISOString()}] Found experiment ID: ${actualExperimentUUID} for name "${parsedVariantData.experiment}"`);
        } else {
          console.warn(`[${new Date().toISOString()}] No experiment found in 'experiments' table with name: "${parsedVariantData.experiment}". Conversion will not be tracked for this specific experiment name.`);
        }
      } else {
        console.log(`[${new Date().toISOString()}] No parsed client variant data or experiment name available to look up experiment ID.`);
      }

      if (actualExperimentUUID && parsedVariantData && parsedVariantData.variantId) {
        console.log(`[${new Date().toISOString()}] Attempting to track conversion for experiment_id: ${actualExperimentUUID}, variant_id: ${parsedVariantData.variantId}`);
        const { error: conversionError } = await supabase
          .from('conversions')
          .insert({
            experiment_id: actualExperimentUUID, 
            variant_id: parsedVariantData.variantId, 
            user_identifier: email, 
            conversion_type: 'quiz_completion',
            details: {
              quiz_score: score,
              quiz_result: resultType,
              referral_code_used: referralCodeUsedBySubmitter, // The code user submitted, if any
              variant_name: parsedVariantData.variantName || 'unknown',
              original_experiment_name: parsedVariantData.experiment 
            }
            // created_at has a DB default
          });

        if (conversionError) {
          console.error(`[${new Date().toISOString()}] Database error tracking conversion in "conversions" table: ${conversionError.message}. Details: ${conversionError.details}`);
        } else {
          console.log(`[${new Date().toISOString()}] Successfully tracked conversion for A/B test in "conversions" table.`);
        }
      } else {
        let reason = "Reason not determined.";
        if (!actualExperimentUUID && parsedVariantData && parsedVariantData.experiment) reason = `Experiment ID (UUID) could not be determined for experiment name "${parsedVariantData.experiment}".`;
        else if (!parsedVariantData || !parsedVariantData.variantId) reason = "Parsed variant data from client or its variantId was missing.";
        else if (!actualExperimentUUID) reason = "Actual experiment UUID was not determined (e.g., experiment name not found).";
        console.log(`[${new Date().toISOString()}] Skipping conversion tracking in "conversions" table. ${reason}`);
        if(parsedVariantData) console.log(`[${new Date().toISOString()}] Client variant data at time of conversion decision:`, parsedVariantData);
      }
      // --- END OF A/B CONVERSION TRACKING ---

      console.log(`[${new Date().toISOString()}] Calling RPC handle_quiz_submission for user ID: ${userId}, Email: ${email}, Score: ${score}, Result: ${resultType}, Referral Code Used: ${referralCodeUsedBySubmitter}`);
      const { data: rpcData, error: rpcError } = await supabase // Capture rpcData if your function returns something
        .rpc('handle_quiz_submission', {
          p_user_id: userId,
          p_email: email, // Redundant if p_user_id is primary, but can be useful
          p_quiz_score: score,
          p_quiz_result: resultType,
          p_referral_code: referralCodeUsedBySubmitter 
        });

      if (rpcError) {
        console.error(`[${new Date().toISOString()}] Database error calling RPC handle_quiz_submission: ${rpcError.message}`);
        throw rpcError;
      }
      console.log(`[${new Date().toISOString()}] RPC handle_quiz_submission called successfully. RPC Data (if any):`, rpcData);

      // Gems might be awarded by RPC, so re-fetch or use RPC result if it returns new gem count
      // For simplicity, let's assume RPC updates gems and we re-fetch.
      console.log(`[${new Date().toISOString()}] Fetching final user data for ID: ${userId} after RPC.`);
      const { data: finalUserData, error: fetchFinalUserError } = await supabase
        .from('user_profiles')
        .select('insight_gems, referral_code')
        .eq('id', userId)
        .single();

      let gemsAwardedThisSession = 100; // Default if not specified by RPC

      if (fetchFinalUserError || !finalUserData) {
        console.error(`[${new Date().toISOString()}] Database error fetching final user data after RPC for user ID ${userId}: ${fetchFinalUserError?.message || 'User data not found'}. Using previously known values for response.`);
        // If fetching fails, use currentInsightGems and userOwnReferralCode from before RPC for response
        // gemsAwardedThisSession might not be accurate here if RPC was supposed to give it.
      } else {
        // Calculate gems awarded if RPC updated the total
        if (finalUserData.insight_gems > currentInsightGems) {
            gemsAwardedThisSession = finalUserData.insight_gems - currentInsightGems;
        } else if (existingUser && finalUserData.insight_gems > existingUser.insight_gems) {
            // If user existed, compare to their original gems before this session's RPC
            gemsAwardedThisSession = finalUserData.insight_gems - existingUser.insight_gems;
        } else if (!existingUser && finalUserData.insight_gems > 0) {
            // New user, gems are what they have now
            gemsAwardedThisSession = finalUserData.insight_gems;
        }
        // else, gemsAwardedThisSession remains the default (e.g. 100) or gems didn't change as expected.

        currentInsightGems = finalUserData.insight_gems;
        userOwnReferralCode = finalUserData.referral_code; 
        console.log(`[${new Date().toISOString()}] Fetched final user data successfully after RPC. Gems: ${currentInsightGems}, Own Referral Code: ${userOwnReferralCode}`);
      }

      // Add user to ConvertKit
      if (convertKitApiKey && convertKitFormId) {
        console.log(`[${new Date().toISOString()}] Attempting to add/update user in ConvertKit: ${email}`);
        try {
          const resultTypeToTagId: Record<string, number> = {
            'Leaning Towards Sex 3.0': 7939502,
            'Mostly Sex 2.0': 7939497,
            'Mostly Sex 3.0': 7939504,
            'Sex 2.0 with Growing Awareness': 7939500
          };
          const tagId = resultTypeToTagId[resultType];
          const tags = tagId ? [tagId] : [];

          const convertKitApiUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;
          const ckResponse = await fetch(convertKitApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: convertKitApiKey,
              email: email,
              first_name: firstName,
              fields: {
                'love_lab_quiz_score': scoreString || '0', 
                'referral_id': userOwnReferralCode || '', // User's own referral code
                'insight_gems': currentInsightGems.toString(), 
                'quiz_result_type': resultType || 'unknown',
                'quiz_taken_at': new Date().toISOString()
              },
              tags: tags
            }),
          });

          if (!ckResponse.ok) {
            const errorBody = await ckResponse.text(); 
            console.error(`[${new Date().toISOString()}] ConvertKit API error. Status: ${ckResponse.status} ${ckResponse.statusText}. Response: ${errorBody}`);
          } else {
            const successBody = await ckResponse.json();
            console.log(`[${new Date().toISOString()}] Successfully added/updated user in ConvertKit: ${email}. Response:`, successBody);
          }
        } catch (ckError) {
          console.error(`[${new Date().toISOString()}] Error during ConvertKit API call for ${email}: ${ckError.message}`);
        }
      } else {
        console.warn(`[${new Date().toISOString()}] ConvertKit API key or form ID not configured. Skipping ConvertKit step for ${email}.`);
      }

      console.log(`[${new Date().toISOString()}] Quiz submission for ${email} processed successfully. Sending response.`);
      return new Response(
        JSON.stringify({ 
          success: true,
          userId,
          gemsEarned: gemsAwardedThisSession, 
          totalGems: currentInsightGems, 
          referralCode: userOwnReferralCode, 
          message: 'Quiz submitted successfully' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (dbOrLogicError) { 
      console.error(`[${new Date().toISOString()}] Error during database operations or main quiz submission logic for email ${email || 'unknown'}: ${dbOrLogicError.message}`, dbOrLogicError.stack);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: dbOrLogicError instanceof Error ? dbOrLogicError.message : 'An error occurred while processing your submission' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (initialError) { 
    console.error(`[${new Date().toISOString()}] Initial error processing quiz submission request (e.g., formData parsing): ${initialError.message}`, initialError.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An error occurred processing your request' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
