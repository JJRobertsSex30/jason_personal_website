import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ cookies: _cookies, redirect }) => {
  const { error } = await supabase.auth.signOut();
  
  // Clear any custom session cookies if you were setting them manually.
  // Supabase client handles its own session storage (e.g., localStorage or HttpOnly cookies managed by the server client if you set that up).
  // If you used Astro.cookies.set for sb-access-token and sb-refresh-token in your page/middleware, clear them here.
  // _cookies.delete('sb-access-token', { path: '/' });
  // _cookies.delete('sb-refresh-token', { path: '/' });

  if (error) {
    console.error('Logout error:', error.message);
    // Optionally, redirect with an error message, though usually not critical for logout.
    // return redirect('/dbTest?error=logout_failed', 302);
  }
  
  // Redirect to the login page (or homepage) after successful logout.
  return redirect('/dbTest', 302); // Redirect back to the test page
};

// It's good practice to only allow POST for actions that change state (like logout).
// If you also want to allow GET for some reason, you can add a GET handler:
// export const GET: APIRoute = async ({ redirect }) => {
//   await supabase.auth.signOut();
//   return redirect('/dbTest');
// }; 