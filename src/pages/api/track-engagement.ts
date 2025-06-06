import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const POST: APIRoute = async ({ request }) => {
  let eventType: string;
  let token: string;

  try {
    const body = await request.json();
    eventType = body.eventType;
    token = body.token;
    if (!eventType || typeof eventType !== 'string' || !token || typeof token !== 'string') {
      throw new Error('eventType and token are required.');
    }
  } catch (e: unknown) {
    let message = 'Failed to parse request body.';
    if (e instanceof Error) {
      message = e.message;
    }
    console.error('Error parsing request body:', message);
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid request body. "eventType" and "token" are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Find the user by their action_token
  const { data: user, error: findError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('action_token', token)
    .single();

  if (findError || !user) {
    console.error('Error finding user by action token:', findError);
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid or expired token.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Invalidate the token by setting it to null
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ action_token: null })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to invalidate action token:', updateError);
    // This is not a fatal error for the user, but should be logged.
  }
  
  // 3. Call the RPC function with the found user's ID
  try {
    const { data, error } = await supabase.rpc('log_user_engagement', {
      p_user_id: user.id,
      p_event_type: eventType,
    });

    if (error) {
      console.error('Error calling log_user_engagement RPC:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to log engagement.', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully logged engagement:', data);
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in /api/track-engagement:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An unexpected error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 