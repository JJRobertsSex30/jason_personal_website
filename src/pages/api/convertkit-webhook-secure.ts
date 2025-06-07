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
    const subscriberState = subscriberData?.state || null;

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
    console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Processing event: ${eventType} for email: ${email} with state: ${subscriberState}`);

    // A mapping of webhook events to our internal kit_state
    const eventToStateMap = {
        'subscriber.subscriber_activate': 'active',
        'subscriber.form_subscribe': 'active', // Assuming form subscribe implies active confirmation
        'subscriber.course_subscribe': 'active',
        'subscriber.tag_add': null, // Tag additions don't change the core state
        'subscriber.subscriber_unsubscribe': 'cancelled',
        'subscriber.subscriber_bounce': 'bounced',
        'subscriber.subscriber_complain': 'complained',
    };

    const newState = eventToStateMap[eventType];

    // If the event maps to a state update, process it.
    if (newState) {
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Updating kit_state to '${newState}' for: ${email}`);
      
      const { data: profileUpdateResult, error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          kit_state: newState,
          is_email_verified: newState === 'active', // Keep this boolean in sync for now
          email_verified_at: newState === 'active' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select('id');

      if (profileUpdateError) {
        console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Error updating user_profiles table for state '${newState}':`, profileUpdateError);
        // We will still return 200 to CK, but log the error.
      } else if (profileUpdateResult && profileUpdateResult.length > 0) {
        console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Successfully updated kit_state for user: ${email}. User ID: ${profileUpdateResult[0].id}`);
      } else {
        console.warn(`[ConvertKit Webhook Secure ${requestTimestamp}] No user_profiles record found for: ${email} during state update.`);
      }

      // Also update the legacy quiz_results table for consistency
      const { error: quizResultsError } = await supabase
        .from('quiz_results')
        .update({ 
          is_email_verified: newState === 'active',
          verification_timestamp: newState === 'active' ? new Date().toISOString() : null,
          // You might want a state column here too in the future
        })
        .eq('email', email);
        
      if (quizResultsError) {
          console.error(`[ConvertKit Webhook Secure ${requestTimestamp}] Error updating quiz_results for state '${newState}':`, quizResultsError);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `State update to '${newState}' processed for ${email}` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (eventType === 'subscriber.tag_add') {
      // Handle tag additions separately if needed in the future, but for now, no state change.
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Ignoring state update for event type: ${eventType} for ${email}`);
      return new Response(JSON.stringify({ success: true, message: `Event type ${eventType} ignored for state change` }), { status: 200 });
    
    } else {
      // Log and ignore other event types
      console.log(`[ConvertKit Webhook Secure ${requestTimestamp}] Ignoring unhandled event type: ${eventType} for ${email}`);
      
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