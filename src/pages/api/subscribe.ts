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
        console.log(`Tracking A/B conversion for variant ${variantIdToTrack}, email: ${email}`);
        
        // Get ab_user_identifier from form data (sent by client-side)
        const abUserIdentifier = formData.get('ab_user_identifier');
        
        if (abUserIdentifier && typeof abUserIdentifier === 'string') {
          console.log(`Using ab_user_identifier for conversion tracking: ${abUserIdentifier}`);
          
          // Get experiment_id for the variant
          const { data: variantData, error: variantError } = await supabase
            .from('variants')
            .select('experiment_id')
            .eq('id', variantIdToTrack)
            .single();

          if (variantError || !variantData) {
            console.error('Error fetching variant experiment_id:', variantError);
          } else {
            // Check for existing conversion by this email for this experiment (to prevent exact duplicates)
            const { data: existingConversion, error: conversionCheckError } = await supabase
              .from('conversions')
              .select('id, variant_id')
              .eq('experiment_id', variantData.experiment_id)
              .eq('user_identifier', email)
              .eq('conversion_type', 'email_signup')
              .maybeSingle();

            if (conversionCheckError && conversionCheckError.code !== 'PGRST116') {
              console.error(`DB error checking existing conversions: ${conversionCheckError.message}`);
            } else if (existingConversion) {
              console.log(`Conversion already exists for email ${email} in this experiment. Skipping duplicate conversion to maintain data integrity.`);
            } else {
              // MODIFIED: Skip eligibility checks for email signups to allow unlimited submissions with different emails
              console.log(`Tracking new email signup conversion: email=${email}, variant=${variantIdToTrack}`);
              console.log(`Note: Skipping eligibility restrictions to enable unlimited signups with different emails`);
              
              // Collect comprehensive analytics data for conversion (same pattern as abTester.ts)
              const userAgent = request.headers.get('user-agent') || null;
              const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;
              
              // Parse device type from user agent (same logic as getDeviceType())
              let deviceType: 'mobile' | 'tablet' | 'desktop' | null = null;
              if (userAgent) {
                if (/Mobile|Android|iPhone/i.test(userAgent)) {
                  deviceType = 'mobile';
                } else if (/iPad|Tablet/i.test(userAgent)) {
                  deviceType = 'tablet';
                } else {
                  deviceType = 'desktop';
                }
              }
              
              // Get UTM parameters from form data
              const utmSource = (formData.get('utm_source') as string) || null;
              const utmMedium = (formData.get('utm_medium') as string) || null;
              const utmCampaign = (formData.get('utm_campaign') as string) || null;
              
              // Fetch geolocation data (same pattern as abTester.ts)
              let geoData = {
                country_code: null as string | null,
                region: null as string | null,
                city: null as string | null
              };

              try {
                console.log('[Subscribe API] Fetching geolocation data...');
                const geoResponse = await fetch('/api/geolocation', {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });

                if (geoResponse.ok) {
                  const geoResult = await geoResponse.json();
                  
                  if (geoResult.success && geoResult.data) {
                    geoData = {
                      country_code: geoResult.data.country_code || null,
                      region: geoResult.data.region || null,
                      city: geoResult.data.city || null
                    };
                    console.log('[Subscribe API] Geolocation data retrieved:', geoData);
                  } else {
                    console.log('[Subscribe API] Geolocation API returned no data');
                  }
                } else {
                  console.warn('[Subscribe API] Geolocation API request failed:', geoResponse.status);
                }
              } catch (error) {
                console.warn('[Subscribe API] Failed to fetch geolocation data:', error);
                // Continue with null values - non-blocking error
              }
              
              // Create conversion data with ONLY fields that exist in conversions table
              const conversionData = {
                // Core required fields
                variant_id: variantIdToTrack,
                experiment_id: variantData.experiment_id,
                user_identifier: email,
                conversion_type: 'email_signup',
                details: {
                  source: signupSource || 'hero-static',
                  email: email,
                  original_variant: abTestVariantId,
                  ab_user_identifier: abUserIdentifier,
                  submission_type: 'unlimited_signups_enabled'
                },
                session_identifier: null, // Server-side doesn't have client session
                
                // Fields that exist in conversions table schema
                country_code: geoData.country_code,
                device_type: deviceType,
                referrer_source: referrer,
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
                time_to_convert: null,
                conversion_value: 1.0,
                conversion_eligibility_verified: true, // Set as verified since we're allowing unlimited submissions
                original_exposure_date: new Date().toISOString(),
                
                // Enhanced metadata (put extra data here instead of non-existent columns)
                metadata: {
                  source: 'subscribe_api',
                  server_side: true,
                  collection_timestamp: new Date().toISOString(),
                  signup_source: signupSource || 'hero-static',
                  geolocation_source: geoData.country_code ? 'ipgeolocation.io' : 'unavailable',
                  user_agent: userAgent,
                  api_endpoint: 'subscribe',
                  // Store extra data that doesn't have dedicated columns
                  region: geoData.region,
                  city: geoData.city,
                  page_url: referrer
                }
              };

              const { error: conversionError } = await supabase
                .from('conversions')
                .insert(conversionData);

              if (conversionError) {
                console.error('Error tracking A/B conversion:', conversionError);
              } else {
                console.log('Email signup conversion tracked successfully (eligibility checks bypassed for unlimited submissions).');
              }
            }
          }
        } else {
          console.log('No ab_user_identifier provided for conversion tracking');
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
