// src/pages/api/quiz-submit.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateReferralId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const score = formData.get('score');
    const resultType = formData.get('resultType');

    // Validate resultType is a string
    if (!resultType || typeof resultType !== 'string') {
      console.error('Invalid resultType:', resultType);
      return new Response(JSON.stringify({ message: 'Invalid quiz result type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Basic email validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ message: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retrieve secret key and form ID from environment variables
    const convertKitApiKey = import.meta.env.CONVERTKIT_API_KEY;
    const convertKitFormId = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID;

    if (!convertKitApiKey || !convertKitFormId) {
       console.error("ConvertKit API Key or Form ID not set in environment variables.");
       return new Response(JSON.stringify({ message: 'Server configuration error.' }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' },
       });
    }

    const convertKitApiUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;

    // Log the data being sent to ConvertKit for debugging
    console.log('Submitting to ConvertKit:', {
      email,
      score,
      resultType
    });

    // Get any referral ID from the form data (if someone used a referral link)
    const incomingReferrerId = formData.get('referrer_id');
    console.log('Received referral ID from form:', incomingReferrerId);
    
    // Generate a new referral ID for the person taking the quiz
    const newReferralId = generateReferralId();
    console.log('Generated referral id:', newReferralId);
    
    const response = await fetch(convertKitApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_secret: convertKitApiKey,
        email: email,
        // ConvertKit expects these fields to be in the 'fields' object
        fields: { 
          "love_lab_quiz_score": score,
          "referral_id": newReferralId,
          "id_of_person_that_referred_me": incomingReferrerId || '' // Ensure it's always a string
        },
        // Add metadata fields directly at the root level
        id_of_person_that_referred_me: incomingReferrerId || '',
        referral_id: newReferralId,
        // Add the appropriate tag based on result type
        tags: {
          "Mostly Sex 2.0": 7939497,
          "Sex 2.0 with Growing Awareness": 7939500,
          "Leaning Towards Sex 3.0": 7939502,
          "Mostly Sex 3.0": 7939504
        }[resultType] || 7939497 // Default to 'Mostly Sex 2.0' if resultType doesn't match
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ConvertKit API error:', response.status, errorData);
      return new Response(JSON.stringify({ message: 'Failed to submit quiz results.', error: errorData }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Successfully submitted quiz results:', data);

    // Store referral relationship in Supabase
    if (incomingReferrerId) {
      // This is a referral signup - store the relationship
      const { error: referralError } = await supabase
        .from('referrals')
        .insert([
          {
            referrer_id: incomingReferrerId,
            new_user_email: email,
            timestamp: new Date().toISOString()
          }
        ]);

      if (referralError) {
        console.error('Error storing referral:', referralError);
      } else {
        console.log('Successfully stored referral relationship');
      }
    }

    // Return the referral ID in the response
    return new Response(JSON.stringify({ 
      message: 'Quiz results submitted successfully!', 
      referralId: newReferralId,
      data: data 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in quiz submission:', error);
    return new Response(JSON.stringify({ message: 'Failed to submit quiz results', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
