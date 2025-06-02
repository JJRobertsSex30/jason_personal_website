export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import crypto from 'crypto';

// Webhook signature verification for security
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Compare signatures using constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Received webhook request`);

  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Webhook signature verification (if ConvertKit supports it)
    const webhookSecret = import.meta.env.CONVERTKIT_WEBHOOK_SECRET;
    const signature = request.headers.get('x-convertkit-signature') || 
                     request.headers.get('x-signature') ||
                     request.headers.get('signature');

    if (webhookSecret && signature) {
      const isValidSignature = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValidSignature) {
        console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Invalid webhook signature`);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid signature' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Webhook signature verified`);
    } else if (webhookSecret) {
      console.warn(`[ConvertKit Webhook Secure ${requestTimestamp}] Webhook secret configured but no signature provided`);
    }

    console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Payload:`, JSON.stringify(payload, null, 2));

    // Extract subscriber information
    const eventType = payload.type;
    const subscriberData = payload.subscriber;

    if (!subscriberData || !subscriberData.email_address) {
      console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Missing subscriber email in payload`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing subscriber email' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const email = subscriberData.email_address.toLowerCase().trim();
    console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Processing event: ${eventType} for email: ${email}`);

    // Handle subscription confirmation events
    if (eventType === 'subscriber.subscriber_activate' || 
        eventType === 'subscriber.form_subscribe' ||
        eventType === 'subscriber.course_subscribe' ||
        eventType === 'subscriber.tag_add') {
      
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Processing email verification for: ${email}`);

      // Use the database function we created for verification
      const { data: functionResult, error: functionError } = await supabase
        .rpc('verify_quiz_email', { 
          email_to_verify: email,
          quiz_type_filter: null  // Verify across all quiz types
        });

      if (functionError) {
        console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Error calling verify_quiz_email function:`, functionError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Database verification function failed' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const recordsUpdated = functionResult || 0;
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Successfully verified ${recordsUpdated} quiz records for ${email}`);

      // Enhanced verification logging with analytics
      try {
        const verificationLogData = {
          email: email,
          verification_source: 'convertkit_webhook_secure',
          event_type: eventType,
          verified_at: new Date().toISOString(),
          records_updated: recordsUpdated,
          subscriber_data: {
            id: subscriberData.id || null,
            state: subscriberData.state || null,
            created_at: subscriberData.created_at || null,
            fields: subscriberData.fields || null
          },
          webhook_metadata: {
            signature_verified: !!signature,
            user_agent: request.headers.get('user-agent'),
            origin: request.headers.get('origin'),
            timestamp: requestTimestamp
          }
        };

        console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Enhanced verification logged:`, verificationLogData);
        
        // Store verification event for analytics (optional)
        // Could insert into a webhook_events table for tracking

      } catch (logError) {
        console.warn(`[ConvertKit Webhook Secure ${requestTimestamp}] Failed to log verification event:`, logError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Email verification processed for ${email}`,
        records_updated: recordsUpdated,
        verification_timestamp: requestTimestamp
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (eventType === 'subscriber.unsubscribe') {
      // Handle unsubscribe events - optionally mark as unverified
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Processing unsubscribe for: ${email}`);
      
      // Optionally mark as unverified when user unsubscribes
      const { data: unsubscribeResult, error: unsubscribeError } = await supabase
        .from('quiz_results')
        .update({ 
          is_email_verified: false,
          verification_timestamp: null 
        })
        .eq('email', email);

      if (unsubscribeError) {
        console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Error processing unsubscribe:`, unsubscribeError);
      } else {
        console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Processed unsubscribe for ${email}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Unsubscribe processed for ${email}` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Log and ignore other event types
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Ignoring event type: ${eventType} for ${email}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Event type ${eventType} processed but no action taken` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (parseError) {
    console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Error parsing webhook payload:`, parseError);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Invalid webhook payload' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET endpoint for webhook health check
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');
  
  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'ConvertKit secure webhook endpoint is active',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/api/convertkit-webhook-secure',
      health: '/api/convertkit-webhook-secure?health=true'
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}; 