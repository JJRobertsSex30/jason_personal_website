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
          
          if (eligibilityResult.tracked) {
            console.log('A/B conversion tracked successfully via eligibility system');
          } else {
            console.log(`User not eligible for A/B testing: ${eligibilityResult.reason}`);
            
            // Get experiment_id for the variant
            const { data: variantData, error: variantError } = await supabase
              .from('variants')
              .select('experiment_id')
              .eq('id', variantIdToTrack)
              .single();

            if (variantError || !variantData) {
              console.error('Error fetching variant experiment_id:', variantError);
            } else {
              // Track new conversion with experiment_id - Use same comprehensive approach as client-side
              
              console.log('[Subscribe API] === DEBUGGING CONVERSION DATA COLLECTION ===');
              
              // Collect comprehensive analytics data for conversion (same pattern as abTester.ts)
              const userAgent = request.headers.get('user-agent') || null;
              const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;
              
              console.log('[Subscribe API] Headers:', {
                userAgent: userAgent ? 'Present' : 'Missing',
                referrer: referrer ? 'Present' : 'Missing',
                allHeaders: Object.fromEntries(request.headers.entries())
              });
              
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
              
              console.log('[Subscribe API] Device detection:', { userAgent, deviceType });
              
              // Get UTM parameters from form data
              const utmSource = (formData.get('utm_source') as string) || null;
              const utmMedium = (formData.get('utm_medium') as string) || null;
              const utmCampaign = (formData.get('utm_campaign') as string) || null;
              
              console.log('[Subscribe API] UTM data:', { utmSource, utmMedium, utmCampaign });
              console.log('[Subscribe API] All form data:', Object.fromEntries(formData.entries()));
              
              // Fetch geolocation data (same pattern as abTester.ts)
              let geoData = {
                country_code: null as string | null,
                region: null as string | null,
                city: null as string | null
              };

              try {
                console.log('[Subscribe API] Conversion: Fetching geolocation data...');
                const geoResponse = await fetch('/api/geolocation', {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });

                console.log('[Subscribe API] Geolocation response status:', geoResponse.status);

                if (geoResponse.ok) {
                  const geoResult = await geoResponse.json();
                  console.log('[Subscribe API] Geolocation raw result:', geoResult);
                  
                  if (geoResult.success && geoResult.data) {
                    geoData = {
                      country_code: geoResult.data.country_code || null,
                      region: geoResult.data.region || null,
                      city: geoResult.data.city || null
                    };
                    console.log('[Subscribe API] Conversion: Geolocation data retrieved:', geoData);
                  } else {
                    console.log('[Subscribe API] Conversion: Geolocation API returned no data');
                  }
                } else {
                  const errorText = await geoResponse.text();
                  console.warn('[Subscribe API] Conversion: Geolocation API request failed:', geoResponse.status, errorText);
                }
              } catch (error) {
                console.warn('[Subscribe API] Conversion: Failed to fetch geolocation data:', error);
                // Continue with null values - non-blocking error
              }
              
              // Create comprehensive conversion data (exact same structure as ConversionPayload)
              const conversionData = {
                // Core fields
                variant_id: variantIdToTrack,
                experiment_id: variantData.experiment_id,
                user_identifier: email,
                conversion_type: 'email_signup',
                details: {
                  source: signupSource || 'hero-static',
                  email: email,
                  original_variant: abTestVariantId,
                  ab_user_identifier: abUserIdentifier
                },
                session_identifier: null, // Server-side doesn't have client session
                
                // Geographic data (same as client-side)
                country_code: geoData.country_code,
                region: geoData.region,
                city: geoData.city,
                
                // Device & technical data
                device_type: deviceType,
                user_agent: userAgent,
                
                // Marketing & UTM (same as client-side)
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
                referrer_source: referrer,
                
                // Performance data
                time_to_convert: null, // Server-side can't calculate this
                page_url: referrer, // Use referrer as page_url since we're on server
                
                // Browser-specific data (null on server-side)
                language_code: null,
                time_zone: null,
                screen_resolution: null,
                viewport_size: null,
                connection_type: null,
                
                // Value & attribution
                conversion_value: 1.0,
                conversion_eligibility_verified: true,
                original_exposure_date: new Date().toISOString(),
                
                // Enhanced metadata (same pattern as client-side)
                metadata: {
                  source: 'subscribe_api',
                  server_side: true,
                  collection_timestamp: new Date().toISOString(),
                  signup_source: signupSource || 'hero-static',
                  geolocation_source: geoData.country_code ? 'ipgeolocation.io' : 'unavailable',
                  user_agent: userAgent,
                  api_endpoint: 'subscribe'
                }
              };

              console.log('[Subscribe API] === FINAL CONVERSION DATA ===');
              console.log('[Subscribe API] Conversion data to insert:', JSON.stringify(conversionData, null, 2));

              const { error: conversionError } = await supabase
                .from('conversions')
                .insert(conversionData);

              if (conversionError) {
                console.error('Error tracking A/B conversion:', conversionError);
              } else {
                console.log('A/B conversion tracked successfully via eligibility system');
              }
            }
          }
        } else {
          console.log('No ab_user_identifier provided for eligibility check');
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
