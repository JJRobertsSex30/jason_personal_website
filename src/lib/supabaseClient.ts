import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are set in your .env file with the PUBLIC_ prefix
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This warning will appear in the browser console if keys are missing
  console.error(
    'CRITICAL: Supabase URL or Anon Key is not configured for the client. \
    Please ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set in your .env file \
    AND that the Astro development server was RESTARTED after setting them. \
    You can find these values in your Supabase project settings.'
  );
  // Throw an error to prevent further execution if Supabase can't be initialized.
  // The createClient would throw anyway, but this is more explicit.
  throw new Error("Supabase client environment variables are not set for client-side execution.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 