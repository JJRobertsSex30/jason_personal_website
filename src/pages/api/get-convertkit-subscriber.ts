import type { APIRoute } from 'astro';
import { getConvertKitSubscriberByEmail, type ConvertKitSubscriber } from '~/lib/convertkit-config';

export const POST: APIRoute = async ({ request }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[API GetConvertKitSubscriber ${requestTimestamp}] Received request.`);

  let email: string | undefined;

  try {
    const data = await request.json();
    email = data.email;
  } catch (error) {
    console.warn(`[API GetConvertKitSubscriber ${requestTimestamp}] Error parsing request body:`, error);
    return new Response(JSON.stringify({ message: 'Invalid request body. Email is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.warn(`[API GetConvertKitSubscriber ${requestTimestamp}] Invalid or missing email: ${email}`);
    return new Response(JSON.stringify({ message: 'Valid email address is required in the request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[API GetConvertKitSubscriber ${requestTimestamp}] Attempting to fetch ConvertKit subscriber for: ${email}`);

  try {
    const result = await getConvertKitSubscriberByEmail(email);

    if (result.success && result.data) {
      console.log(`[API GetConvertKitSubscriber ${requestTimestamp}] Successfully fetched data for ${email}.`);
      
      // Log the app_confirmation_token if present for debugging
      const appConfirmationToken = result.data.fields?.app_confirmation_token;
      if (appConfirmationToken) {
        console.log(`[API GetConvertKitSubscriber ${requestTimestamp}] Found app_confirmation_token: ${appConfirmationToken} for ${email}`);
      } else {
        console.warn(`[API GetConvertKitSubscriber ${requestTimestamp}] app_confirmation_token NOT FOUND in custom fields for ${email}`);
      }

      const clientSafeData: Partial<ConvertKitSubscriber> = {
        id: result.data.id,
        first_name: result.data.first_name,
        email_address: result.data.email_address,
        state: result.data.state,
        created_at: result.data.created_at,
        fields: result.data.fields, // Send all custom fields
      };
      return new Response(JSON.stringify({ success: true, data: clientSafeData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.warn(`[API GetConvertKitSubscriber ${requestTimestamp}] Failed to fetch data for ${email}: ${result.error}`);
      return new Response(JSON.stringify({ success: false, message: result.error || 'Failed to fetch subscriber data from ConvertKit.' }), {
        status: result.error === 'Subscriber not found.' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API GetConvertKitSubscriber ${requestTimestamp}] Unexpected error fetching subscriber ${email}: ${errorMessage}`, error);
    return new Response(JSON.stringify({ message: 'An unexpected error occurred on the server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 