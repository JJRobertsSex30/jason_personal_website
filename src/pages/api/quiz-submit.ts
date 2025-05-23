// src/pages/api/quiz-submit.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const convertKitApiKey = import.meta.env.CONVERTKIT_API_KEY;  // No PUBLIC_ prefix for server-side
const convertKitFormId = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID;  // Keep this as is since it's used in the client-side code

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

if (!convertKitApiKey || !convertKitFormId) {
  throw new Error('Missing convertKit configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const POST = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const score = formData.get('score')?.toString();
    const resultType = formData.get('resultType')?.toString();
    const referralCode = formData.get('referralCode')?.toString() || null;

    // Validate required fields
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Valid email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!resultType) {
      return new Response(
        JSON.stringify({ success: false, message: 'Quiz result is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // First, check if user exists in user_profiles
      const { data: existingUser, error: userLookupError } = await supabase
        .from('user_profiles')
        .select('id, email, gems_balance, referral_code')
        .eq('email', email)
        .maybeSingle();

      if (userLookupError) {
        console.error('Error looking up user:', userLookupError);
        throw userLookupError;
      }

      let userId: string;

      if (existingUser) {
        // User exists, use their existing ID
        userId = existingUser.id;

      } else {
        // User doesn't exist, create a new user profile
        const newUserId = crypto.randomUUID();
        const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // Insert into user_profiles
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: newUserId,
            email,
            referral_code: newReferralCode,
            gems_balance: 0 // Will be updated by the RPC call
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          throw insertError;
        }

        userId = newUserId;
      }

      // Call the database function to process the quiz and referral
      const { error: rpcError } = await supabase
        .rpc('handle_quiz_submission', {
          p_user_id: userId,
          p_email: email,
          p_quiz_score: score ? parseInt(score) : 0,
          p_quiz_result: resultType,
          p_referral_code: referralCode
        })
        .select()
        .single();

      if (rpcError) {
        console.error('Error processing quiz submission:', rpcError);
        throw rpcError;
      }

      // Get updated user data
      const { data: updatedUser, error: fetchError } = await supabase
        .from('user_profiles')
        .select('gems_balance, referral_code')
        .eq('id', userId)
        .single();

      if (fetchError || !updatedUser) {
        console.error('Failed to fetch updated user data:', fetchError);
        throw new Error('Failed to retrieve updated user data');
      }

      // Add user to ConvertKit with direct API call
      if (convertKitApiKey && convertKitFormId) {
        try {
          const convertKitApiUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;
          const response = await fetch(convertKitApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: convertKitApiKey,  // This should now have the correct API key
              email: email,
              fields: {
                quiz_result: resultType,
                quiz_score: score || '0',
                referral_code: updatedUser.referral_code
              },
              tags: ['quiz-completed']
            }),
          });

          if (!response.ok) {
            const errorText  = await response.json();
            console.error('ConvertKit API error status:', response.status);
            console.error('ConvertKit API error status text:', response.statusText);          
            console.error('ConvertKit API error:', errorText );
            try {
              const errorData = JSON.parse(errorText );
              console.error('ConvertKit API error JSON:', errorData);
            } catch  {
              console.error('Could not parse error response as JSON');
            }
          } else {
            console.log('Successfully added to ConvertKit:', email);
          }
        } catch (ckError) {
          console.error('Failed to add user to ConvertKit:', ckError);
          // Don't fail the request if ConvertKit fails
        }
      } else {
        console.warn('ConvertKit API key or form ID not configured');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          userId,
          gemsEarned: 100, // Base quiz completion gems
          totalGems: updatedUser.gems_balance,
          referralCode: updatedUser.referral_code,
          message: 'Quiz submitted successfully' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error in quiz submission:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error instanceof Error ? error.message : 'An error occurred while processing your submission' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error processing quiz submission:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'An error occurred while processing your submission' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
