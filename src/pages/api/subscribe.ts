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

    // Track A/B test conversion
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

    // Track conversion if we have a variant ID
    if (variantIdToTrack) {
      try {
        console.log(`Tracking A/B conversion for variant ${variantIdToTrack}, email: ${email}`);
        
        // Check if this email has already converted for this variant (prevent duplicates)
        const { data: existingConversion, error: checkError } = await supabase
          .from('conversions')
          .select('id')
          .eq('variant_id', variantIdToTrack)
          .eq('user_identifier', email)
          .eq('conversion_type', 'email_signup')
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error checking existing conversion:', checkError);
        } else if (existingConversion) {
          console.log('Conversion already exists for this email and variant');
        } else {
          // Track new conversion
          const { error: conversionError } = await supabase
            .from('conversions')
            .insert([{
              variant_id: variantIdToTrack,
              user_identifier: email,
              conversion_type: 'email_signup',
              conversion_value: 1,
              metadata: {
                source: signupSource || 'unknown',
                email: email,
                original_variant: abTestVariant || abTestVariantId
              }
            }]);

          if (conversionError) {
            console.error('Error tracking A/B conversion:', conversionError);
          } else {
            console.log('A/B conversion tracked successfully');
          }
        }
      } catch (conversionTrackingError) {
        console.error('Error in A/B conversion tracking:', conversionTrackingError);
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
