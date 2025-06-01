// src/pages/api/subscribe.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const abTestVariantId = formData.get('ab_test_variant_id'); // Supabase variant ID (UUID)
    const signupSource = formData.get('signup_source');

    console.log('Subscribe API received:', { 
      email, 
      abTestVariantId, 
      signupSource 
    });

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

    const convertKitResult = await response.json();
    console.log('ConvertKit API Response:', { status: response.status, result: convertKitResult });

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        message: convertKitResult.message || 'Failed to subscribe to newsletter.' 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine variant ID to track for A/B testing
    let variantIdToTrack = null;
    
    // Option 1: Direct Supabase variant ID (from custom A/B test components)
    if (abTestVariantId && typeof abTestVariantId === 'string') {
      variantIdToTrack = abTestVariantId;
      console.log(`Using direct Supabase variant ID: ${variantIdToTrack}`);
    }

    // Track conversion using the new eligibility system
    if (variantIdToTrack) {
      try {
        console.log(`Tracking A/B conversion via eligibility system for variant ${variantIdToTrack}, email: ${email}`);
        
        // Import the eligibility checking function
        const { handleReturnUserConversion } = await import('~/lib/userEligibility');
        
        // Get ab_user_identifier from form data (sent by client-side)
        const abUserIdentifier = formData.get('ab_user_identifier');
        
        if (abUserIdentifier && typeof abUserIdentifier === 'string') {
          console.log(`Using ab_user_identifier for eligibility check: ${abUserIdentifier}`);
          
          // Check eligibility using the same identifier as impression tracking
          const eligibilityResult = await handleReturnUserConversion(
            abUserIdentifier, // Use same identifier as impression tracking
            variantIdToTrack,
            'email_signup',
            1, // conversion value
            {
              source: signupSource || 'hero-static',
              email: email,
              original_variant: abTestVariantId
            }
          );
          
          if (eligibilityResult.wasEligible) {
            console.log('A/B conversion tracked successfully via eligibility system');
          } else if (eligibilityResult.existingConversion) {
            console.log('Conversion already exists for this email and variant');
          } else {
            // Get experiment_id for the variant
            const { data: variantData, error: variantError } = await supabase
              .from('variants')
              .select('experiment_id')
              .eq('id', variantIdToTrack)
              .single();

            if (variantError || !variantData) {
              console.error('Error fetching variant experiment_id:', variantError);
            } else {
              // Track new conversion with experiment_id
              const { error: conversionError } = await supabase
                .from('conversions')
                .insert([{
                  variant_id: variantIdToTrack,
                  experiment_id: variantData.experiment_id,
                  user_identifier: email, // Use email for business purposes
                  conversion_type: 'email_signup',
                  conversion_value: 1,
                  details: {
                    source: signupSource || 'hero-static',
                    email: email,
                    original_variant: abTestVariantId,
                    ab_user_identifier: abUserIdentifier // Store both for reference
                  }
                }]);

              if (conversionError) {
                console.error('Error tracking A/B conversion:', conversionError);
              } else {
                console.log('A/B conversion tracked successfully via eligibility system');
              }
            }
          }
        } else {
          // User not eligible (return user) - conversion tracked as engagement instead
          console.log(`User not eligible for A/B testing: ${eligibilityResult.reason}`);
        }
      } catch (error) {
        console.error('Error in A/B conversion tracking:', error);
      }
    } else {
      console.log('No A/B variant ID provided, skipping A/B conversion tracking');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Thank you for subscribing! Please check your email to confirm your subscription.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Subscribe API Error:', error);
    return new Response(JSON.stringify({ 
      message: 'An error occurred while processing your subscription.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
