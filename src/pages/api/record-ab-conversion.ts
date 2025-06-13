import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient'; // Assuming you'll use Supabase
import { checkUserEligibilityForABTesting } from '../../lib/userEligibility';

interface ConversionPayload {
  email?: string; // Optional, as token might be primary identifier
  app_confirmation_token: string;
  ab_test_variant_id?: string | null; // Can be null if not part of a test
  browser_identifier?: string | null;
  session_identifier?: string | null;
  original_exposure_timestamp?: string | null; // ISO string
  page_url_at_submission?: string | null; // URL where the original A/B form was
  conversion_type: string; // e.g., 'email_confirmed', 'purchase_completed'
  conversion_value?: number;
  // You might add other relevant metadata here
  conversion_metadata?: Record<string, unknown>; 
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const payload: ConversionPayload = await request.json();
    const { app_confirmation_token: token } = payload;
    const requestTimestamp = new Date().toISOString();

    if (!token) {
      return new Response(JSON.stringify({ error: "Confirmation token is required" }), { status: 400 });
    }

    const { data: pendingConfirmation, error: tokenError } = await supabase
      .from('pending_email_confirmations')
      .select('*')
      .eq('confirmation_token', token)
      .single();

    if (tokenError || !pendingConfirmation) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 404 });
    }

    const experimentId = pendingConfirmation.experiment_id;
    const variantId = pendingConfirmation.variant_id;
    const userIdentifier = pendingConfirmation.browser_identifier;
    const sessionIdentifier = pendingConfirmation.session_identifier;
    const submissionDetails = pendingConfirmation.submission_details || {};

    // Check for existing conversion
    const { data: existingConversions, error: existingConversionCheckError } = await supabase
      .from('conversions')
      .select('id')
      .eq('user_id', userIdentifier)
      .eq('experiment_id', experimentId);

    if (existingConversionCheckError) {
      console.warn(`[API RecordABConversion ${requestTimestamp}] DB error checking existing conversions:`, existingConversionCheckError.message);
    }
    
    const conversionTimestamp = new Date();
    const originalExposureDate: Date | null = new Date(pendingConfirmation.original_exposure_timestamp);

    // --- Determine device_type and other fields from pendingConfirmation or submissionDetails ---
    const deviceType = pendingConfirmation.device_type || submissionDetails.device_type || 'unknown';
    const anonymousUserId = pendingConfirmation.anonymous_user_id || submissionDetails.anonymous_user_id || null;
    const timeToConvert = pendingConfirmation.time_to_convert || null;
    const conversionContext = pendingConfirmation.conversion_context || submissionDetails.conversion_context || null;

    // --- Eligibility check for conversion ---
    const eligibility = await checkUserEligibilityForABTesting(userIdentifier);
    const conversionEligibilityVerified = eligibility.isEligible;

    const conversionDataToInsert = {
      experiment_id: experimentId,
      variant_id: variantId, 
      user_id: userIdentifier, 
      session_identifier: sessionIdentifier, 
      conversion_type: payload.conversion_type,
      conversion_value: payload.conversion_value || 0,
      details: {
        confirmation_token_used: token,
        client_ip_at_conversion: clientAddress,
        page_url_at_initial_submission: submissionDetails.page_url_at_submission,
        form_source_at_initial_submission: submissionDetails.form_source,
        ...(payload.conversion_metadata || {}),
      },
      metadata: {
        source_ip: clientAddress,
      },
      traffic_source: 'direct', 
      referrer_source: submissionDetails.referrer_source || null,
      utm_source: submissionDetails.utm_source,
      utm_medium: submissionDetails.utm_medium,
      utm_campaign: submissionDetails.utm_campaign,
      utm_term: submissionDetails.utm_term,
      utm_content: submissionDetails.utm_content,
      created_at: conversionTimestamp.toISOString(),
      original_exposure_date: originalExposureDate ? originalExposureDate.toISOString() : null,
      device_type: deviceType,
      anonymous_user_id: anonymousUserId,
      time_to_convert: timeToConvert,
      conversion_context: conversionContext,
      conversion_eligibility_verified: conversionEligibilityVerified,
    };

    if (!existingConversions || existingConversions.length === 0) {
      const { data: newConversion, error: insertError } = await supabase
        .from('conversions')
        .insert(conversionDataToInsert)
        .select('id')
        .single();

      if (insertError) {
        console.error(`[API RecordABConversion ${requestTimestamp}] DB error inserting conversion: ${insertError.message}`);
      } else if (newConversion) {
        console.log(`[API RecordABConversion ${requestTimestamp}] Successfully inserted conversion with ID: ${newConversion.id}`);
        // Attribution logic can now safely use newConversion.id
        if(userIdentifier) {
            const { data: participation, error: participationError } = await supabase
                .from('user_experiment_participation')
                .select('experiment_id, variant_id')
                .eq('user_id', userIdentifier)
                .order('first_seen_at', { ascending: false })
                .limit(1)
                .single();
    
            if (participationError && participationError.code !== 'PGRST116') {
                console.error(`[API RecordABConversion ${requestTimestamp}] DB error checking for experiment participation: ${participationError.message}`);
            } else if (participation) {
                const attributionData = {
                    conversion_id: newConversion.id,
                    experiment_id: participation.experiment_id,
                    variant_id: participation.variant_id,
                    user_id: userIdentifier,
                    attribution_type: 'email_verification_first_touch'
                };
                
                const { error: attributionError } = await supabase
                    .from('conversion_attributions')
                    .insert(attributionData);
    
                if (attributionError) {
                    console.error(`[API RecordABConversion ${requestTimestamp}] DB error inserting into 'conversion_attributions': ${attributionError.message}`);
                }
            }
        }
      }
    }
      
    // Update the pending_email_confirmations table
    const { error: updateConfirmationError } = await supabase
      .from('pending_email_confirmations')
      .update({ confirmed_at: conversionTimestamp.toISOString(), status: 'confirmed' })
      .eq('id', pendingConfirmation.id);

    if (updateConfirmationError) {
      console.error(`[API RecordABConversion ${requestTimestamp}] DB error updating 'pending_email_confirmations': ${updateConfirmationError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Conversion recorded successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[API RecordABConversion] Unhandled error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Server Error', message: errorMessage }), { status: 500 });
  }
}; 