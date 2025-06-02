export const prerender = false;
import type { APIRoute } from 'astro';
import { updateRecord } from '~/lib/database-operations';

export const POST: APIRoute = async ({ request }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[ConvertKit Webhook ${requestTimestamp}] Received webhook request`);

  try {
    // Parse the webhook payload
    const payload = await request.json();
    console.log(`[ConvertKit Webhook ${requestTimestamp}] Payload:`, JSON.stringify(payload, null, 2));

    // ConvertKit sends different event types - we care about subscription confirmations
    const eventType = payload.type;
    const subscriberData = payload.subscriber;

    if (!subscriberData || !subscriberData.email_address) {
      console.error(`[ConvertKit Webhook ${requestTimestamp}] Missing subscriber email in payload`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing subscriber email' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const email = subscriberData.email_address.toLowerCase().trim();
    console.log(`[ConvertKit Webhook ${requestTimestamp}] Processing event: ${eventType} for email: ${email}`);

    // Handle subscription confirmation events
    if (eventType === 'subscriber.subscriber_activate' || 
        eventType === 'subscriber.form_subscribe' ||
        eventType === 'subscriber.course_subscribe' ||
        eventType === 'subscriber.tag_add') {
      
      console.log(`[ConvertKit Webhook ${requestTimestamp}] Processing email verification for: ${email}`);

      // Update quiz_results table to mark email as verified
      const { data: updatedRecords, error: updateError } = await updateRecord(
        'quiz_results',
        { is_email_verified: true },
        { 
          email: email,
          is_email_verified: false  // Only update records that aren't already verified
        }
      );

      if (updateError) {
        console.error(`[ConvertKit Webhook ${requestTimestamp}] Error updating quiz_results:`, updateError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Database update failed' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const recordsUpdated = Array.isArray(updatedRecords) ? updatedRecords.length : (updatedRecords ? 1 : 0);
      console.log(`[ConvertKit Webhook ${requestTimestamp}] Successfully updated ${recordsUpdated} quiz records for ${email}`);

      // Log the verification event for analytics
      try {
        const verificationLogData = {
          email: email,
          verification_source: 'convertkit_webhook',
          event_type: eventType,
          verified_at: new Date().toISOString(),
          subscriber_id: subscriberData.id || null,
          metadata: {
            webhook_payload: payload,
            records_updated: recordsUpdated,
            subscriber_state: subscriberData.state || null,
            subscriber_created_at: subscriberData.created_at || null,
            custom_fields: subscriberData.fields || null
          }
        };

        // Insert into a verification log table if it exists, otherwise just log
        console.log(`[ConvertKit Webhook ${requestTimestamp}] Verification logged:`, verificationLogData);
        
      } catch (logError) {
        console.warn(`[ConvertKit Webhook ${requestTimestamp}] Failed to log verification event:`, logError);
        // Don't fail the webhook for logging errors
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Email verification processed for ${email}`,
        records_updated: recordsUpdated
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Handle other event types we don't care about
      console.log(`[ConvertKit Webhook ${requestTimestamp}] Ignoring event type: ${eventType} for ${email}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Event type ${eventType} ignored` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (parseError) {
    console.error(`[ConvertKit Webhook ${requestTimestamp}] Error parsing webhook payload:`, parseError);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Invalid webhook payload' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET endpoint for webhook verification (some webhook services require this)
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');
  
  if (challenge) {
    // Webhook verification challenge response
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'ConvertKit webhook endpoint is active',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}; 