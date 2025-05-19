// src/pages/api/quiz-submit.ts
export const prerender = false;
import type { APIRoute } from 'astro';

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

    const referralId = generateReferralId();
    console.log('Successfully set referral id:', referralId);
    

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
          "referral_id": referralId
        },
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

    if (data.referralId) {
      console.log('Successfully set referral id:', data);
      localStorage.setItem("my_referral_id", data.referralId);
    }

    return new Response(JSON.stringify({ message: 'Quiz results submitted successfully!', referralId: referralId, data: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in quiz submission:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
