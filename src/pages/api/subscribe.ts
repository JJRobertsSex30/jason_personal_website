// src/pages/api/subscribe.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const abTestVariantId = formData.get('ab_test_variant_id'); // Supabase variant ID (UUID)
    const abTestVariant = formData.get('ab_test_variant'); // PostHog variant name 
    const signupSource = formData.get('signup_source');

    console.log('Subscribe API received:', { 
      email, 
      abTestVariantId, 
      abTestVariant, 
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

    // Track A/B test conversion using new eligibility system
    let variantIdToTrack: string | null = null;

    // Option 1: Direct Supabase variant ID (from HeroCustomAB.astro)
    if (abTestVariantId && typeof abTestVariantId === 'string') {
      variantIdToTrack = abTestVariantId;
      console.log('Using direct Supabase variant ID:', variantIdToTrack);
    }
    // Option 2: PostHog variant name (from Hero.astro) - map to Supabase
    else if (abTestVariant && typeof abTestVariant === 'string') {
      try {
        // Map PostHog variant names to Supabase variants
        // Look for the hero headline experiment and find matching variant
        const { data: heroExperiment, error: expError } = await supabase
          .from('experiments')
          .select(`
            id,
            variants (id, name, config_json)
          `)
          .eq('name', 'hero-section-headline-test')
          .eq('is_active', true)
          .single();

        if (expError) {
          console.log('No hero-section-headline-test experiment found in Supabase:', expError.message);
        } else if (heroExperiment && heroExperiment.variants) {
          // Map PostHog variant names to Supabase variants
          const variantMapping = {
            'control': 'Control',
            'variation-b': 'Variation B'
          };
          
          const mappedName = variantMapping[abTestVariant] || abTestVariant;
          const matchingVariant = heroExperiment.variants.find(v => 
            v.name.toLowerCase() === mappedName.toLowerCase()
          );

          if (matchingVariant) {
            variantIdToTrack = matchingVariant.id;
            console.log(`Mapped PostHog variant '${abTestVariant}' to Supabase variant '${matchingVariant.name}' (${variantIdToTrack})`);
          } else {
            console.log(`No matching Supabase variant found for PostHog variant '${abTestVariant}'`);
          }
        }
      } catch (mappingError) {
        console.error('Error mapping PostHog variant to Supabase:', mappingError);
      }
    }

    // Track conversion using the new eligibility system (NEW)
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
              source: signupSource || 'hero-custom-ab',
              email: email,
              original_variant: abTestVariant || abTestVariantId
            }
          );
          
          if (eligibilityResult.tracked) {
            // User is eligible - proceed with normal A/B test conversion tracking
            // NOTE: Still use email as user_identifier in conversions table for business logic
            // but eligibility was checked with ab_user_identifier
            // Check for existing conversion to prevent duplicates
            const { data: existingConversion, error: checkError } = await supabase
              .from('conversions')
              .select('id')
              .eq('variant_id', variantIdToTrack)
              .eq('user_identifier', email) // Still use email for conversion records
              .eq('conversion_type', 'email_signup')
              .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
              console.error('Error checking existing conversion:', checkError);
            } else if (existingConversion) {
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
                      source: signupSource || 'hero-custom-ab',
                      email: email,
                      original_variant: abTestVariant || abTestVariantId,
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
        } else {
          console.warn('No ab_user_identifier provided by client. Cannot check eligibility consistently with impression tracking.');
          // Fallback to email-based checking (less consistent but functional)
          const eligibilityResult = await handleReturnUserConversion(
            email,
            variantIdToTrack,
            'email_signup',
            1,
            {
              source: signupSource || 'hero-custom-ab',
              email: email,
              original_variant: abTestVariant || abTestVariantId,
              note: 'fallback_email_checking'
            }
          );
          
          if (eligibilityResult.tracked) {
            console.log('Proceeding with email-based eligibility check (fallback)');
            // ... rest of conversion tracking logic would go here
          } else {
            console.log(`Fallback: User not eligible for A/B testing: ${eligibilityResult.reason}`);
          }
        }
      } catch (conversionTrackingError) {
        console.error('Error in eligibility-based A/B conversion tracking:', conversionTrackingError);
        // Don't fail the whole request if conversion tracking fails
      }
    } else {
      console.log('No variant ID to track - no A/B testing conversion recorded');
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Thank you for subscribing! Please check your email to confirm.',
      data: data 
    }), {
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
