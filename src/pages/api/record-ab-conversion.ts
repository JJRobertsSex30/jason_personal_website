import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient'; // Assuming you'll use Supabase

interface ConversionPayload {
  email?: string; // Optional, as token might be primary identifier
  app_confirmation_token: string;
  ab_test_variant_id?: string | null; // Can be null if not part of a test
  browser_identifier?: string | null;
  session_identifier?: string | null;
  original_exposure_timestamp?: string | null; // ISO string
  page_url_at_submission?: string | null; // URL where the original A/B form was
  conversion_type: string; // e.g., 'email_confirmed', 'purchase_completed'
  // You might add other relevant metadata here
  conversion_metadata?: Record<string, unknown>; 
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[API RecordABConversion ${requestTimestamp}] Received request from IP: ${clientAddress}`);

  let payload: ConversionPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.warn(`[API RecordABConversion ${requestTimestamp}] Error parsing request body:`, error);
    return new Response(JSON.stringify({ success: false, message: 'Invalid request body. JSON expected.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[API RecordABConversion ${requestTimestamp}] Received payload:`, payload);

  // Basic validation
  if (!payload.app_confirmation_token || !payload.conversion_type) {
    console.warn(`[API RecordABConversion ${requestTimestamp}] Missing required fields: app_confirmation_token or conversion_type.`);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Missing required fields: app_confirmation_token and conversion_type are required.' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- 1. Validate app_confirmation_token and get associated data --- 
    // This is a placeholder. You'll need to implement this based on your DB schema.
    // Example: Check against `pending_email_confirmations` table.
    console.log(`[API RecordABConversion ${requestTimestamp}] Placeholder: Validating app_confirmation_token: ${payload.app_confirmation_token}`);
    const { data: pendingConfirmation, error: tokenError } = await supabase
      .from('pending_email_confirmations')
      .select('id, email, variant_id, experiment_id, browser_identifier, session_identifier, original_exposure_timestamp, submission_details, confirmed_at')
      .eq('confirmation_token', payload.app_confirmation_token)
      .maybeSingle();

    if (tokenError) {
      console.error(`[API RecordABConversion ${requestTimestamp}] DB error validating token: ${tokenError.message}`);
      return new Response(JSON.stringify({ success: false, message: 'Database error during token validation.' }), { status: 500 });
    }

    if (!pendingConfirmation) {
      console.warn(`[API RecordABConversion ${requestTimestamp}] Invalid or unknown app_confirmation_token: ${payload.app_confirmation_token}`);
      return new Response(JSON.stringify({ success: false, message: 'Invalid or expired confirmation token.' }), { status: 404 });
    }

    if (pendingConfirmation.confirmed_at) {
        console.warn(`[API RecordABConversion ${requestTimestamp}] Token ${payload.app_confirmation_token} already used at ${pendingConfirmation.confirmed_at}.`);
        // Decide if this is an error or just a note. For now, allow re-processing but log it.
        // You might return a 409 Conflict or a success if re-processing is fine.
    }

    // --- 2. Determine Experiment ID if not already present ---
    let experimentId = pendingConfirmation.experiment_id;
    const variantId = pendingConfirmation.variant_id || payload.ab_test_variant_id;
    const userIdentifier = pendingConfirmation.browser_identifier; // This is the ab_user_identifier from localStorage
    const sessionIdentifier = pendingConfirmation.session_identifier || payload.session_identifier;

    if (!userIdentifier) {
      console.warn(`[API RecordABConversion ${requestTimestamp}] Critical: user_identifier (browser_identifier) is missing from pendingConfirmation. Cannot reliably record conversion.`);
      // Depending on strictness, you might return an error here
    }

    if (!experimentId && variantId) {
        console.log(`[API RecordABConversion ${requestTimestamp}] Experiment ID missing, attempting to look up via variant ID: ${variantId}`);
        const { data: variantData, error: variantError } = await supabase
            .from('variants')
            .select('experiment_id')
            .eq('id', variantId)
            .single();
        if (variantError) {
            console.error(`[API RecordABConversion ${requestTimestamp}] DB error fetching experiment ID for variant ${variantId}: ${variantError.message}`);
            // Continue without experiment_id, or handle as critical error
        } else if (variantData) {
            experimentId = variantData.experiment_id;
            console.log(`[API RecordABConversion ${requestTimestamp}] Found experiment_id ${experimentId} for variant ${variantId}`);
        }
    }

    // --- 3. Record the conversion event ---
    console.log(`[API RecordABConversion ${requestTimestamp}] Preparing to record conversion event for email: ${pendingConfirmation.email}, User Identifier: ${userIdentifier}`);
    
    // Determine if this is the first conversion for this user in this experiment
    let isFirstConversion = true;
    if (userIdentifier && experimentId) {
      const { data: existingConversions, error: existingConversionError } = await supabase
        .from('conversions')
        .select('id')
        .eq('user_identifier', userIdentifier)
        .eq('experiment_id', experimentId)
        .limit(1);

      if (existingConversionError) {
        console.warn(`[API RecordABConversion ${requestTimestamp}] DB error checking for existing conversions: ${existingConversionError.message}. Proceeding as if first conversion.`);
      } else if (existingConversions && existingConversions.length > 0) {
        isFirstConversion = false;
        console.log(`[API RecordABConversion ${requestTimestamp}] Existing conversion found for user ${userIdentifier} in experiment ${experimentId}. Marking as not first conversion.`);
      }
    }

    const conversionTimestamp = new Date();
    let timeToConvertSeconds = null;
    const originalExposureDate = pendingConfirmation.original_exposure_timestamp ? new Date(pendingConfirmation.original_exposure_timestamp) : null;
    if (originalExposureDate) {
      timeToConvertSeconds = Math.round((conversionTimestamp.getTime() - originalExposureDate.getTime()) / 1000);
    }

    const submissionDetails = pendingConfirmation.submission_details || {};

    const getJsonStringOrNull = (value: unknown): string | null => {
      if (value === null || typeof value === 'undefined') {
        return null;
      }
      return String(value);
    };

    // const utmSourceRaw = submissionDetails.utm_source || submissionDetails.UTM_SOURCE; // Removed for simplification
    // const utmMediumRaw = submissionDetails.utm_medium || submissionDetails.UTM_MEDIUM; // Removed for simplification
    // const utmCampaignRaw = submissionDetails.utm_campaign || submissionDetails.UTM_CAMPAIGN; // Removed for simplification
    // const referrerSourceRaw = submissionDetails.referrer_source || submissionDetails.page_referrer; // Removed for simplification

    const conversionDetailsForJson = {
        confirmation_token_used: payload.app_confirmation_token,
        client_ip_at_conversion: clientAddress,
        page_url_at_initial_submission: submissionDetails.page_url_at_submission || payload.page_url_at_submission,
        form_source_at_initial_submission: submissionDetails.form_source,
        // Include other parts of pendingConfirmation.submission_details if they are not mapped elsewhere
        ...(payload.conversion_metadata || {}), // Any additional metadata passed in payload
    };

    const conversionDataToInsert = {
      experiment_id: experimentId,
      variant_id: variantId, 
      user_identifier: userIdentifier, 
      session_identifier: sessionIdentifier, 
      conversion_type: payload.conversion_type, // e.g., 'email_confirmed'
      details: conversionDetailsForJson, 
      metadata: { // For new structured metadata fields in `conversions` table
        confirmation_token_used: payload.app_confirmation_token,
        initial_submission_details: submissionDetails,
        payload_metadata: payload.conversion_metadata || null,
        source_ip: clientAddress,
      },
      created_at: conversionTimestamp.toISOString(),
      original_exposure_date: originalExposureDate ? originalExposureDate.toISOString() : null,
      is_first_conversion_for_experiment: isFirstConversion,
      conversion_attribution_source: 'email_confirmation', // Or derive more dynamically if needed
      time_to_convert: timeToConvertSeconds,
      conversion_eligibility_verified: true, // Assuming confirmation implies eligibility for this step
      conversion_context: { stage: 'email_confirmed' }, // Basic context
      // UTM and referrer fields will rely on DB defaults (if nullable) or be null
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referrer_source: null,
      // country_code: null, // If available from initial submission & needed
      // device_type: null, // If available from initial submission & needed
      // conversion_value: null // If applicable and available
    };

    console.log(`[API RecordABConversion ${requestTimestamp}] Simplified conversion data to insert into 'conversions' table:`, conversionDataToInsert);

    const { error: conversionInsertError } = await supabase
      .from('conversions') // Corrected table name to 'conversions'
      .insert(conversionDataToInsert);

    if (conversionInsertError) {
      console.error(`[API RecordABConversion ${requestTimestamp}] DB error inserting into 'conversions': ${conversionInsertError.message}`);
      return new Response(JSON.stringify({ success: false, message: 'Database error recording conversion.' }), { status: 500 });
    }
    
    console.log(`[API RecordABConversion ${requestTimestamp}] Conversion recorded successfully into 'conversions' for ${pendingConfirmation.email}.`);

    // --- 4. Update pending_email_confirmations (e.g., mark as confirmed) ---
    // YOU MUST VERIFY `pending_email_confirmations` table and its columns `confirmed_at` and `status` from your schema.
    if (!pendingConfirmation.confirmed_at) {
        console.log(`[API RecordABConversion ${requestTimestamp}] Marking email as confirmed in 'pending_email_confirmations' for token ${payload.app_confirmation_token}`);
        
        const { error: updateConfirmError } = await supabase
        .from('pending_email_confirmations')
        .update({ 
            confirmed_at: new Date().toISOString(), 
            is_confirmed: true // Corrected from status: 'confirmed' to is_confirmed: true based on schema
        })
        .eq('id', pendingConfirmation.id);

        if (updateConfirmError) {
        console.error(`[API RecordABConversion ${requestTimestamp}] DB error updating 'pending_email_confirmations': ${updateConfirmError.message}`);
        // This might not be a fatal error for the conversion itself, but should be logged.
        }
    } else {
        console.log(`[API RecordABConversion ${requestTimestamp}] Email already marked as confirmed at ${pendingConfirmation.confirmed_at} in 'pending_email_confirmations'. Skipping update.`);
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Conversion recorded successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API RecordABConversion ${requestTimestamp}] Outer error processing conversion: ${errorMessage}`, error);
    return new Response(JSON.stringify({ success: false, message: 'An unexpected server error occurred.', error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 