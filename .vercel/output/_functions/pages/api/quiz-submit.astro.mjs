import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const supabaseUrl = "https://jlhcvjhmsgnuvbqvjnpc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaGN2amhtc2dudXZicXZqbnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU2MTEyNSwiZXhwIjoyMDYzMTM3MTI1fQ.UubX6VKuJVLfp93-ylwwpOCGhfb-rSfBvsb6ZEKC6NU";
const convertKitApiKey = "Wwqsqd2msW9GKDmXgQHgYw";
const convertKitFormId = "8052635";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
const POST = async ({ request }) => {
  const requestTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[API Quiz Submit ${requestTimestamp}] Received request.`);
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString().toLowerCase().trim();
    const firstName = (formData.get("firstName") || formData.get("first_name"))?.toString().trim() || "";
    const scoreString = formData.get("score")?.toString();
    const resultType = formData.get("resultType")?.toString();
    const referralCodeUsedBySubmitter = formData.get("referrer_id")?.toString() || formData.get("referralCode")?.toString() || null;
    const variantInfoString = formData.get("variantInfo")?.toString();
    const sessionIdFromClient = formData.get("session_identifier")?.toString() || null;
    console.log(`[API Quiz Submit ${requestTimestamp}] Form Data: email=${email}, firstName=${firstName}, score=${scoreString}, resultType=${resultType}, referralUsed=${referralCodeUsedBySubmitter}, variantInfoPresent=${!!variantInfoString}, sessionId=${sessionIdFromClient}`);
    let parsedVariantData = null;
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
    if (!email || !email.includes("@")) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: Email invalid/missing. Email: ${email}`);
      return new Response(JSON.stringify({ success: false, message: "Valid email is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!resultType) {
      console.warn(`[API Quiz Submit ${requestTimestamp}] Validation fail: resultType missing.`);
      return new Response(JSON.stringify({ success: false, message: "Quiz result is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
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
    try {
      console.log(`[API Quiz Submit ${requestTimestamp}] Looking up user: ${email}`);
      const { data: existingUser, error: userLookupError } = await supabase.from("user_profiles").select("id, email, insight_gems, referral_code").eq("email", email).maybeSingle();
      if (userLookupError) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error looking up user ${email}: ${userLookupError.message}`);
        throw userLookupError;
      }
      let userId;
      let userOwnReferralCode;
      let currentInsightGems = 0;
      let isNewUser = false;
      if (existingUser) {
        userId = existingUser.id;
        userOwnReferralCode = existingUser.referral_code || "";
        currentInsightGems = existingUser.insight_gems || 0;
        console.log(`[API Quiz Submit ${requestTimestamp}] Existing user: ID ${userId}, Gems ${currentInsightGems}, Own Referral ${userOwnReferralCode}`);
      } else {
        isNewUser = true;
        const newUserId = crypto.randomUUID();
        const newUserOwnReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        currentInsightGems = 0;
        console.log(`[API Quiz Submit ${requestTimestamp}] Creating new user: ${email}, ID ${newUserId}, Own Referral ${newUserOwnReferralCode}`);
        const { error: insertError } = await supabase.from("user_profiles").insert({ id: newUserId, email, first_name: firstName, referral_code: newUserOwnReferralCode, insight_gems: 0 });
        if (insertError) {
          console.error(`[API Quiz Submit ${requestTimestamp}] DB error creating user ${email}: ${insertError.message}`);
          throw insertError;
        }
        userId = newUserId;
        userOwnReferralCode = newUserOwnReferralCode;
        console.log(`[API Quiz Submit ${requestTimestamp}] New user created: ID ${userId}`);
      }
      let actualExperimentUUID = null;
      if (parsedVariantData && parsedVariantData.experiment) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Looking up experiment ID for name: "${parsedVariantData.experiment}"`);
        const { data: experimentRecord, error: expError } = await supabase.from("experiments").select("id").eq("name", parsedVariantData.experiment).maybeSingle();
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
        const { data: existingConversion, error: conversionCheckError } = await supabase.from("conversions").select("id, variant_id").eq("experiment_id", actualExperimentUUID).eq("user_identifier", email).eq("conversion_type", "quiz_completion").maybeSingle();
        if (conversionCheckError && conversionCheckError.code !== "PGRST116") {
          console.error(`[API Quiz Submit ${requestTimestamp}] DB error checking existing conversions: ${conversionCheckError.message}`);
        } else if (existingConversion) {
          console.log(`[API Quiz Submit ${requestTimestamp}] Conversion already exists for email ${email} in experiment ${actualExperimentUUID}. Skipping duplicate conversion.`);
        } else {
          console.log(`[API Quiz Submit ${requestTimestamp}] Tracking new conversion: expUUID=${actualExperimentUUID}, varID=${parsedVariantData.variantId}, email=${email}, session=${sessionIdFromClient}`);
          const { error: conversionError } = await supabase.from("conversions").insert({
            experiment_id: actualExperimentUUID,
            variant_id: parsedVariantData.variantId,
            user_identifier: email,
            conversion_type: "quiz_completion",
            session_identifier: sessionIdFromClient,
            details: {
              quiz_score: score,
              quiz_result: resultType,
              referral_code_used: referralCodeUsedBySubmitter,
              variant_name: parsedVariantData.variantName || "unknown",
              original_experiment_name: parsedVariantData.experiment
            }
          });
          if (conversionError) {
            console.error(`[API Quiz Submit ${requestTimestamp}] DB error tracking conversion: ${conversionError.message}. Details: ${conversionError.details}`);
          } else {
            console.log(`[API Quiz Submit ${requestTimestamp}] Conversion tracked successfully.`);
          }
        }
      } else {
        let reason = "Reason not determined.";
        if (!actualExperimentUUID && parsedVariantData && parsedVariantData.experiment) reason = `Exp. ID (UUID) not found for name "${parsedVariantData.experiment}".`;
        else if (!parsedVariantData || !parsedVariantData.variantId) reason = "Client variant data or variantId missing.";
        else if (!actualExperimentUUID) reason = "Exp. UUID not determined (e.g., name not found).";
        console.log(`[API Quiz Submit ${requestTimestamp}] Skipping conversion tracking. ${reason}`);
        if (parsedVariantData) console.log(`[API Quiz Submit ${requestTimestamp}] Client variant data at conversion decision:`, parsedVariantData);
      }
      console.log(`[API Quiz Submit ${requestTimestamp}] Calling RPC handle_quiz_submission for user ${userId}, email ${email}, score ${score}, result ${resultType}, referralUsed ${referralCodeUsedBySubmitter}`);
      const { data: rpcData, error: rpcError } = await supabase.rpc("handle_quiz_submission", {
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
      const { data: finalUserData, error: fetchFinalUserError } = await supabase.from("user_profiles").select("insight_gems, referral_code").eq("id", userId).single();
      let gemsEarnedThisSession = 0;
      if (fetchFinalUserError || !finalUserData) {
        console.error(`[API Quiz Submit ${requestTimestamp}] DB error fetching final user data for user ${userId}: ${fetchFinalUserError?.message || "User data not found"}. Using pre-RPC values for response.`);
        if (isNewUser) gemsEarnedThisSession = 100;
      } else {
        const gemsBeforeRPC = currentInsightGems;
        currentInsightGems = finalUserData.insight_gems;
        userOwnReferralCode = finalUserData.referral_code;
        if (isNewUser) {
          gemsEarnedThisSession = currentInsightGems;
        } else {
          gemsEarnedThisSession = currentInsightGems - gemsBeforeRPC;
        }
        if (gemsEarnedThisSession < 0) gemsEarnedThisSession = 0;
        console.log(`[API Quiz Submit ${requestTimestamp}] Final user data for user ${userId}: Gems ${currentInsightGems}, Own Referral ${userOwnReferralCode}, Gems Earned This Session ${gemsEarnedThisSession}`);
      }
      if (convertKitApiKey && convertKitFormId) {
        console.log(`[API Quiz Submit ${requestTimestamp}] Adding/updating in ConvertKit: ${email}`);
        try {
          const resultTypeToTagId = {
            "Leaning Towards Sex 3.0": 7939502,
            "Mostly Sex 2.0": 7939497,
            "Mostly Sex 3.0": 7939504,
            "Sex 2.0 with Growing Awareness": 7939500
          };
          const tagId = resultTypeToTagId[resultType];
          const tags = tagId ? [tagId] : [];
          const convertKitApiUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;
          const ckResponse = await fetch(convertKitApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: convertKitApiKey,
              email,
              first_name: firstName,
              fields: {
                "love_lab_quiz_score": scoreString || "0",
                "referral_id": userOwnReferralCode || "",
                "insight_gems": currentInsightGems.toString(),
                "quiz_result_type": resultType || "unknown",
                "quiz_taken_at": (/* @__PURE__ */ new Date()).toISOString()
                // Use requestTimestamp for consistency if preferred
              },
              tags
            })
          });
          if (!ckResponse.ok) {
            const errorBody = await ckResponse.text();
            console.error(`[API Quiz Submit ${requestTimestamp}] ConvertKit API error for ${email}. Status: ${ckResponse.status} ${ckResponse.statusText}. Response: ${errorBody}`);
          } else {
            const successBody = await ckResponse.json();
            console.log(`[API Quiz Submit ${requestTimestamp}] ConvertKit OK for ${email}. Response:`, successBody);
          }
        } catch (ckError) {
          console.error(`[API Quiz Submit ${requestTimestamp}] Error during ConvertKit API call for ${email}: ${ckError.message}`);
        }
      }
      console.log(`[API Quiz Submit ${requestTimestamp}] Submission for ${email} processed. Sending success response.`);
      return new Response(
        JSON.stringify({
          success: true,
          userId,
          gemsEarned: gemsEarnedThisSession,
          totalGems: currentInsightGems,
          referralCode: userOwnReferralCode,
          message: "Quiz submitted successfully"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (dbOrLogicError) {
      console.error(`[API Quiz Submit ${requestTimestamp}] Error in main logic for ${email || "N/A"}: ${dbOrLogicError.message}`, dbOrLogicError.stack);
      return new Response(JSON.stringify({ success: false, message: "Server error processing submission" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  } catch (initialError) {
    console.error(`[API Quiz Submit ${requestTimestamp}] Initial request processing error: ${initialError.message}`, initialError.stack);
    return new Response(JSON.stringify({ success: false, message: "Error processing request" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
