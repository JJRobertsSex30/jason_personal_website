import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';
import { updateConvertKitSubscriber } from '~/lib/convertkit-operations';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId, userEmail } = await request.json();
    if (!userId && !userEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Missing userId or userEmail' }), { status: 400 });
    }
    let restored = false;
    // Try to find the user in the DB if userId is provided
    if (userId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, deleted_at')
        .eq('id', userId)
        .single();
      if (!profileError && userProfile && userProfile.email) {
        // Soft deleted user: restore in DB and subscribe in Kit
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ deleted_at: null, kit_state: 'unsubscribed' })
          .eq('id', userId);
        if (updateError) {
          return new Response(JSON.stringify({ success: false, error: updateError.message }), { status: 500 });
        }
        const kitResult = await updateConvertKitSubscriber(userProfile.email);
        if (!kitResult.success) {
          return new Response(JSON.stringify({ success: false, error: kitResult.error }), { status: 500 });
        }
        restored = true;
      }
    }
    // If not restored by userId, try by userEmail
    if (!restored && userEmail) {
      const kitResult = await updateConvertKitSubscriber(userEmail);
      if (!kitResult.success) {
        return new Response(JSON.stringify({ success: false, error: kitResult.error }), { status: 500 });
      }
      restored = true;
    }
    if (restored) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'User not found in DB and restore by email failed.' }), { status: 404 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}; 