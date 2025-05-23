// src/pages/api/subscribe.ts
export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email');

    // Basic email validation (can be expanded)
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ message: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retrieve secret key and form ID from environment variables
    const convertKitApiKey = import.meta.env.SECRET;
    const convertKitFormId = import.meta.env.PUBLIC_CONVERTKIT_FORM_ID; // Form ID can be public

    if (!convertKitApiKey || !convertKitFormId) {
       console.error("ConvertKit API Key or Form ID not set in environment variables.");
       return new Response(JSON.stringify({ message: 'Server configuration error.' }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' },
       });
    }

    const convertKitApiUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;

    const response = await fetch(convertKitApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_secret: convertKitApiKey,
        email: email,
        // Add other fields or tags if needed, e.g.:
        // fields: { first_name: formData.get('name') },
        // tags: [12345], // Replace with actual tag ID if you use tags
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ConvertKit API error:', response.status, errorData);
      return new Response(JSON.stringify({ message: 'Failed to subscribe.', error: errorData }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Successfully subscribed:', data);

    return new Response(JSON.stringify({ message: 'Successfully subscribed!', data: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Server error during subscribe:', error);
    return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
