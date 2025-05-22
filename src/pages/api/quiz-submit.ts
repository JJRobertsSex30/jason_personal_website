// src/pages/api/quiz-submit.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
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
    const referralCode = formData.get('referralCode')?.toString();

    // Validate inputs
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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This email is already registered' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID(),
    });

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to create user account' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    try {
      // Create user profile with initial gems
      const { error: profileError } = await supabase
        .rpc('create_user_with_referral', {
          p_user_id: userId,
          p_email: email,
          p_referral_code: referralCode || null,
          p_quiz_result: resultType,
          p_quiz_score: score ? parseInt(score) : 0
        });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        throw profileError;
      }

      // Record quiz completion
      const { error: quizError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          score: score ? parseInt(score) : null,
          result_type: resultType,
          earned_gems: 25
        });

      if (quizError) throw quizError;

      // Get updated user data
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('gems_balance, referral_code')
        .eq('id', userId)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true,
          userId,
          gemsBalance: userData?.gems_balance || 0,
          referralCode: userData?.referral_code,
          message: 'Quiz submitted successfully' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      console.error('Error in quiz submission:', error);
      throw error;
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
