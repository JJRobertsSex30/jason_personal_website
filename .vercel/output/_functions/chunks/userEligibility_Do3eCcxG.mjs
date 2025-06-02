import { s as supabase } from './supabaseClient_C6_a71Ro.mjs';

async function checkUserEligibilityForABTesting(userIdentifier, experimentId) {
  try {
    const { data: siteWideConversions, error: conversionError } = await supabase.from("conversions").select("experiment_id, variant_id, conversion_type, created_at").eq("user_identifier", userIdentifier).limit(5);
    if (conversionError) {
      console.error("[UserEligibility] Error checking site-wide conversions:", conversionError);
      return {
        isEligible: true,
        reason: "eligible"
      };
    }
    if (siteWideConversions && siteWideConversions.length > 0) {
      console.log(`[UserEligibility] User ${userIdentifier} ineligible: already converted site-wide`);
      return {
        isEligible: false,
        reason: "already_converted_site_wide",
        details: {
          previousConversions: siteWideConversions
        }
      };
    }
    if (experimentId) {
      const { data: recentImpressions, error: impressionError } = await supabase.from("impressions").select("impression_at").eq("user_identifier", userIdentifier).eq("experiment_id", experimentId).gte("impression_at", new Date(Date.now() - 2 * 60 * 1e3).toISOString()).limit(1);
      if (impressionError) {
        console.error("[UserEligibility] Error checking recent impressions:", impressionError);
      } else if (recentImpressions && recentImpressions.length > 0) {
        return {
          isEligible: false,
          reason: "duplicate_impression",
          details: {
            lastImpressionAt: recentImpressions[0].impression_at
          }
        };
      }
    }
    return {
      isEligible: true,
      reason: "eligible"
    };
  } catch (error) {
    console.error("[UserEligibility] Unexpected error in eligibility check:", error);
    return {
      isEligible: true,
      reason: "eligible"
    };
  }
}
async function trackIneligibleUserEngagement(userIdentifier, experimentName, variantName, pageUrl, engagementType = "page_view") {
  try {
    const { error } = await supabase.from("user_engagement_tracking").insert({
      user_identifier: userIdentifier,
      engagement_type: engagementType,
      experiment_context: experimentName,
      variant_context: variantName,
      page_url: pageUrl,
      metadata: {
        user_status: "return_converter",
        tracking_purpose: "engagement_analytics",
        excluded_from_ab_testing: true
      }
    });
    if (error) {
      console.error("[UserEligibility] Error tracking ineligible user engagement:", error);
    } else {
      console.log(`[UserEligibility] Tracked engagement for ineligible user: ${engagementType}`);
    }
  } catch (error) {
    console.error("[UserEligibility] Unexpected error tracking engagement:", error);
  }
}
async function handleReturnUserConversion(userIdentifier, variantId, conversionType, conversionValue, details) {
  const eligibility = await checkUserEligibilityForABTesting(userIdentifier);
  if (!eligibility.isEligible && eligibility.reason === "already_converted_site_wide") {
    await supabase.from("user_engagement_tracking").insert({
      user_identifier: userIdentifier,
      engagement_type: "repeat_conversion",
      metadata: {
        original_variant_id: variantId,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        details,
        user_status: "return_converter",
        tracking_purpose: "engagement_analytics",
        excluded_from_ab_testing: true
      }
    });
    return {
      tracked: false,
      reason: "Tracked as engagement for return converter, not as A/B test conversion"
    };
  }
  return {
    tracked: true,
    reason: "User eligible for A/B test conversion tracking"
  };
}

export { checkUserEligibilityForABTesting, handleReturnUserConversion, trackIneligibleUserEngagement };
