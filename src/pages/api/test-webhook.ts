export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  const requestTimestamp = new Date().toISOString();
  console.log(`[Test Webhook ${requestTimestamp}] Received test request`);

  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();

    // Rest of the function code...
  } catch (error) {
    console.error(`[Test Webhook ${requestTimestamp}] Error processing request:`, error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Invalid request' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 