import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

// Helper function for basic device type detection (similar to subscribe.ts)
function getDeviceTypeFromUserAgent(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' | null {
  if (!userAgent) return null;
  if (/Mobile|Android|iPhone/i.test(userAgent)) {
    return 'mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const requestTimestamp = new Date().toISOString();
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  console.log(`[API Confirm Email ${requestTimestamp}] Received request from IP: ${clientAddress} with token: ${token}`);

  if (!token) {
    console.warn(`[API Confirm Email ${requestTimestamp}] No token provided.`);
    return new Response(JSON.stringify({ success: false, message: 'Confirmation token is missing.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Find the pending confirmation record by token
    console.log(`[API Confirm Email ${requestTimestamp}] Looking up token: ${token}`);
    const { data: pendingConfirmation, error: lookupError } = await supabase
      .from('pending_email_confirmations')
      .select('*') // Select all fields to get A/B context
      .eq('confirmation_token', token)
      .single();

    if (lookupError || !pendingConfirmation) {
      console.warn(`[API Confirm Email ${requestTimestamp}] Token not found or DB error: ${lookupError?.message || 'No record'}. Token: ${token}`);
      return new Response(JSON.stringify({ success: false, message: 'Invalid or expired confirmation token.' }), {
        status: 404, // Not Found or Bad Request might be appropriate
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[API Confirm Email ${requestTimestamp}] Found pending confirmation for email: ${pendingConfirmation.email}, ID: ${pendingConfirmation.id}`);

    // 2. Check if already confirmed or expired
    if (pendingConfirmation.is_confirmed) {
      console.log(`[API Confirm Email ${requestTimestamp}] Token already confirmed for email: ${pendingConfirmation.email}. ID: ${pendingConfirmation.id}`);
      // Allow to proceed to indicate success to user, but don't re-process conversion
      return new Response(JSON.stringify({ success: true, message: 'Email already confirmed.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const expiresAt = new Date(pendingConfirmation.expires_at);
    if (now > expiresAt) {
      console.warn(`[API Confirm Email ${requestTimestamp}] Token expired for email: ${pendingConfirmation.email}. ID: ${pendingConfirmation.id}. Expires: ${pendingConfirmation.expires_at}`);
      return new Response(JSON.stringify({ success: false, message: 'Confirmation token has expired.' }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Mark as confirmed in pending_email_confirmations
    const confirmedAt = now.toISOString();
    console.log(`[API Confirm Email ${requestTimestamp}] Updating pending confirmation for email: ${pendingConfirmation.email}. ID: ${pendingConfirmation.id}`);
    const { error: updateConfirmError } = await supabase
      .from('pending_email_confirmations')
      .update({ is_confirmed: true, confirmed_at: confirmedAt })
      .eq('id', pendingConfirmation.id);

    if (updateConfirmError) {
      console.error(`[API Confirm Email ${requestTimestamp}] DB error updating pending confirmation for ${pendingConfirmation.email}: ${updateConfirmError.message}`);
      return new Response(JSON.stringify({ success: false, message: 'Failed to update confirmation status.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log(`[API Confirm Email ${requestTimestamp}] Successfully marked as confirmed for email: ${pendingConfirmation.email}.`);

    // 4. Log the A/B Conversion if A/B context exists
    if (pendingConfirmation.experiment_id && pendingConfirmation.variant_id && pendingConfirmation.browser_identifier) {
      console.log(`[API Confirm Email ${requestTimestamp}] Proceeding to log A/B conversion for email: ${pendingConfirmation.email}, Experiment: ${pendingConfirmation.experiment_id}`);
      
      // Determine the time to convert in seconds
      const submittedAt = new Date(pendingConfirmation.created_at);
      const timeToConvert = (now.getTime() - submittedAt.getTime()) / 1000; // in seconds

      // Extract details from the submission_details JSON blob
      const submissionDetails = pendingConfirmation.submission_details || {};

      // Basic geo data (can be enriched if needed, e.g. by calling geolocation API again using clientAddress if stored)
      // For now, using what might have been in submission_details or default to null
      const geo = {
        country_code: submissionDetails.ip_address_country_code || null, // Assuming ip_address might include geo info
        region: submissionDetails.ip_address_region || null,
        city: submissionDetails.ip_address_city || null,
      };
      const deviceType = getDeviceTypeFromUserAgent(submissionDetails.user_agent || null);

      // Step 4: Record a conversion event for this successful email confirmation
      const conversionData = {
        conversion_type: 'email_confirmed',
        user_id: pendingConfirmation.browser_identifier, // Critical: Use the browser_identifier from impression
        conversion_value: 0,
        metadata: { 
          email_used: pendingConfirmation.email,
          token_used: token,
          source_table: 'pending_email_confirmations',
          source_record_id: pendingConfirmation.id,
          api_endpoint: '/api/confirm-email',
          confirmation_token_used: token,
        },
        session_identifier: pendingConfirmation.session_identifier,
        conversion_eligibility_verified: true, // Implicitly verified by going through double opt-in
        original_exposure_date: pendingConfirmation.original_exposure_timestamp, // Already an ISO string or null
        conversion_context: {
          confirmation_method: 'double_opt_in_link',
          form_source_at_submission: submissionDetails.form_source || 'unknown',
        },
        // Fields from database-schema.md for conversions table
        country_code: geo.country_code,
        device_type: deviceType, 
        referrer_source: submissionDetails.page_url_at_submission, // Or a more specific referrer if captured
        utm_source: submissionDetails.utm_source || null, // Assuming these might be in submission_details
        utm_medium: submissionDetails.utm_medium || null,
        utm_campaign: submissionDetails.utm_campaign || null,
        time_to_convert: timeToConvert,
      };

      console.log(`[API Confirm Email ${requestTimestamp}] Inserting conversion data for ${pendingConfirmation.email}:`, conversionData);
      const { error: conversionInsertError } = await supabase
        .from('conversions')
        .insert(conversionData);

      if (conversionInsertError) {
        console.error(`[API Confirm Email ${requestTimestamp}] DB error inserting A/B conversion for ${pendingConfirmation.email}: ${conversionInsertError.message}. Details:`, conversionInsertError.details);
        // Don't fail the whole confirmation if only conversion logging fails, but log it seriously.
      } else {
        console.log(`[API Confirm Email ${requestTimestamp}] Successfully logged A/B conversion for ${pendingConfirmation.email}.`);
      }
    } else {
      console.log(`[API Confirm Email ${requestTimestamp}] Skipping A/B conversion logging for ${pendingConfirmation.email} due to missing A/B context (experiment_id, variant_id, or browser_identifier).`);
    }
    
    // 5. (Optional) Update user_profiles.is_email_confirmed if such a field exists
    // Example:
    // const { error: updateUserProfileError } = await supabase
    //   .from('user_profiles')
    //   .update({ is_email_confirmed: true, email_confirmed_at: confirmedAt })
    //   .eq('email', pendingConfirmation.email);
    // if (updateUserProfileError) { 
    //   console.error(`[API Confirm Email ${requestTimestamp}] Error updating user_profile for ${pendingConfirmation.email}: ${updateUserProfileError.message}`);
    // }

    console.log(`[API Confirm Email ${requestTimestamp}] Email confirmation process complete for ${pendingConfirmation.email}.`);
    return new Response(JSON.stringify({ success: true, message: 'Email confirmed successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API Confirm Email ${requestTimestamp}] General error: ${errorMessage}`, error);
    return new Response(JSON.stringify({ success: false, message: 'An unexpected error occurred during confirmation.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 