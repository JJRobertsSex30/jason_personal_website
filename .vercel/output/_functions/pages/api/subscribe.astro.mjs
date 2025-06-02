import { s as supabase } from '../../chunks/supabaseClient_C6_a71Ro.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const POST = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const abTestVariantId = formData.get("ab_test_variant_id");
    const signupSource = formData.get("signup_source");
    console.log("Subscribe API received:", {
      email,
      abTestVariantId,
      signupSource
    });
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ message: "Invalid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const convertKitApiKey = "psf8upzIjOh9udfmp-5687TrLR7XTcawMp_Kff9tLq4";
    const convertKitFormId = "8052635";
    if (!convertKitApiKey || !convertKitFormId) ;
    const convertKitApiUrl = `https://api.convertkit.com/v3/forms/${convertKitFormId}/subscribe`;
    const response = await fetch(convertKitApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_secret: convertKitApiKey,
        email
        // Add other fields or tags if needed, e.g.:
        // fields: { first_name: formData.get('name') },
        // tags: [12345], // Replace with actual tag ID if you use tags
      })
    });
    const convertKitResult = await response.json();
    console.log("ConvertKit API Response:", { status: response.status, result: convertKitResult });
    if (!response.ok) {
      return new Response(JSON.stringify({
        message: convertKitResult.message || "Failed to subscribe to newsletter."
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    let variantIdToTrack = null;
    if (abTestVariantId && typeof abTestVariantId === "string") {
      variantIdToTrack = abTestVariantId;
      console.log(`Using direct Supabase variant ID: ${variantIdToTrack}`);
    }
    if (variantIdToTrack) {
      try {
        console.log(`Tracking A/B conversion via eligibility system for variant ${variantIdToTrack}, email: ${email}`);
        const { handleReturnUserConversion } = await import('../../chunks/userEligibility_Do3eCcxG.mjs');
        const abUserIdentifier = formData.get("ab_user_identifier");
        if (abUserIdentifier && typeof abUserIdentifier === "string") {
          console.log(`Using ab_user_identifier for eligibility check: ${abUserIdentifier}`);
          const eligibilityResult = await handleReturnUserConversion(
            abUserIdentifier,
            // Use same identifier as impression tracking
            variantIdToTrack,
            "email_signup",
            1,
            // conversion value
            {
              source: signupSource || "hero-static",
              email,
              original_variant: abTestVariantId
            }
          );
          if (eligibilityResult.tracked) {
            console.log("A/B conversion tracked successfully via eligibility system");
          } else {
            console.log(`User not eligible for A/B testing: ${eligibilityResult.reason}`);
            const { data: variantData, error: variantError } = await supabase.from("variants").select("experiment_id").eq("id", variantIdToTrack).single();
            if (variantError || !variantData) {
              console.error("Error fetching variant experiment_id:", variantError);
            } else {
              console.log("[Subscribe API] === DEBUGGING CONVERSION DATA COLLECTION ===");
              const userAgent = request.headers.get("user-agent") || null;
              const referrer = request.headers.get("referer") || request.headers.get("referrer") || null;
              console.log("[Subscribe API] Headers:", {
                userAgent: userAgent ? "Present" : "Missing",
                referrer: referrer ? "Present" : "Missing",
                allHeaders: Object.fromEntries(request.headers.entries())
              });
              let deviceType = null;
              if (userAgent) {
                if (/Mobile|Android|iPhone/i.test(userAgent)) {
                  deviceType = "mobile";
                } else if (/iPad|Tablet/i.test(userAgent)) {
                  deviceType = "tablet";
                } else {
                  deviceType = "desktop";
                }
              }
              console.log("[Subscribe API] Device detection:", { userAgent, deviceType });
              const utmSource = formData.get("utm_source") || null;
              const utmMedium = formData.get("utm_medium") || null;
              const utmCampaign = formData.get("utm_campaign") || null;
              console.log("[Subscribe API] UTM data:", { utmSource, utmMedium, utmCampaign });
              console.log("[Subscribe API] All form data:", Object.fromEntries(formData.entries()));
              let geoData = {
                country_code: null,
                region: null,
                city: null
              };
              try {
                console.log("[Subscribe API] Conversion: Fetching geolocation data...");
                const geoResponse = await fetch("/api/geolocation", {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json"
                  }
                });
                console.log("[Subscribe API] Geolocation response status:", geoResponse.status);
                if (geoResponse.ok) {
                  const geoResult = await geoResponse.json();
                  console.log("[Subscribe API] Geolocation raw result:", geoResult);
                  if (geoResult.success && geoResult.data) {
                    geoData = {
                      country_code: geoResult.data.country_code || null,
                      region: geoResult.data.region || null,
                      city: geoResult.data.city || null
                    };
                    console.log("[Subscribe API] Conversion: Geolocation data retrieved:", geoData);
                  } else {
                    console.log("[Subscribe API] Conversion: Geolocation API returned no data");
                  }
                } else {
                  const errorText = await geoResponse.text();
                  console.warn("[Subscribe API] Conversion: Geolocation API request failed:", geoResponse.status, errorText);
                }
              } catch (error) {
                console.warn("[Subscribe API] Conversion: Failed to fetch geolocation data:", error);
              }
              const conversionData = {
                // Core required fields
                variant_id: variantIdToTrack,
                experiment_id: variantData.experiment_id,
                user_identifier: email,
                conversion_type: "email_signup",
                details: {
                  source: signupSource || "hero-static",
                  email,
                  original_variant: abTestVariantId,
                  ab_user_identifier: abUserIdentifier
                },
                session_identifier: null,
                // Server-side doesn't have client session
                // Fields that exist in conversions table schema
                country_code: geoData.country_code,
                device_type: deviceType,
                referrer_source: referrer,
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
                time_to_convert: null,
                conversion_value: 1,
                conversion_eligibility_verified: true,
                original_exposure_date: (/* @__PURE__ */ new Date()).toISOString(),
                // Enhanced metadata (put extra data here instead of non-existent columns)
                metadata: {
                  source: "subscribe_api",
                  server_side: true,
                  collection_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  signup_source: signupSource || "hero-static",
                  geolocation_source: geoData.country_code ? "ipgeolocation.io" : "unavailable",
                  user_agent: userAgent,
                  api_endpoint: "subscribe",
                  // Store extra data that doesn't have dedicated columns
                  region: geoData.region,
                  city: geoData.city,
                  page_url: referrer
                }
              };
              console.log("[Subscribe API] === FINAL CONVERSION DATA ===");
              console.log("[Subscribe API] Conversion data to insert:", JSON.stringify(conversionData, null, 2));
              const { error: conversionError } = await supabase.from("conversions").insert(conversionData);
              if (conversionError) {
                console.error("Error tracking A/B conversion:", conversionError);
              } else {
                console.log("A/B conversion tracked successfully via eligibility system");
              }
            }
          }
        } else {
          console.log("No ab_user_identifier provided for eligibility check");
        }
      } catch (error) {
        console.error("Error in A/B conversion tracking:", error);
      }
    } else {
      console.log("No A/B variant ID provided, skipping A/B conversion tracking");
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Thank you for subscribing! Please check your email to confirm your subscription."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Subscribe API Error:", error);
    return new Response(JSON.stringify({
      message: "An error occurred while processing your subscription."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
