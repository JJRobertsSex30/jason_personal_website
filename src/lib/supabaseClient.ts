import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are set in your .env file or deployment environment
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn(
      'Supabase URL or Anon Key is not configured. Please update your .env file with PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY. \
      You can find these in your Supabase project settings.'
    );
  }
  // In a production environment, you might want to throw an error or handle this more gracefully
  // For now, we allow the client to be created, but it will likely fail if an operation is attempted.
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || ''); 