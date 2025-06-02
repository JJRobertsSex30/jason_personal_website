import { supabase } from './supabaseClient';

/**
 * User Eligibility Checker for A/B Testing
 * 
 * Implements best practices for A/B testing data integrity:
 * - Users who have converted in ANY experiment are ineligible for future experiments
 * - Maintains statistical validity by preventing bias from return converters
 * - Separates A/B test data from general engagement analytics
 */

export interface UserEligibilityResult {
  isEligible: boolean;
  reason: 'eligible' | 'already_converted_site_wide' | 'already_converted_experiment' | 'duplicate_impression';
  details?: {
    previousConversions?: Array<{
      experiment_id: string;
      variant_id: string;
      conversion_type: string;
      created_at: string;
    }>;
    lastImpressionAt?: string;
  };
}

/**
 * Check if a user is eligible for A/B testing
 * Returns false if user has converted anywhere on the site before
 * Fails gracefully on network errors to ensure A/B testing continues working
 */
export async function checkUserEligibilityForABTesting(
  userIdentifier: string,
  experimentId?: string
): Promise<UserEligibilityResult> {
  try {
    // 1. Check for ANY site-wide conversions for this user
    const { data: siteWideConversions, error: conversionError } = await supabase
      .from('conversions')
      .select('experiment_id, variant_id, conversion_type, created_at')
      .eq('user_identifier', userIdentifier)
      .limit(5); // Limit for performance, we just need to know if ANY exist

    if (conversionError) {
      console.error('[UserEligibility] Error checking site-wide conversions:', conversionError);
      
      // Check if this is a network connectivity issue
      if (conversionError.message?.includes('NetworkError') || 
          conversionError.message?.includes('fetch') ||
          conversionError.message?.includes('network') ||
          conversionError.code === '' || conversionError.code === 'NETWORK_ERROR') {
        console.warn('[UserEligibility] Network connectivity issue detected. Allowing A/B testing to continue to prevent service disruption.');
        // On network error, default to eligible to avoid blocking legitimate users
        return {
          isEligible: true,
          reason: 'eligible'
        };
      }
      
      // For other types of errors, also default to eligible
      console.warn('[UserEligibility] Database error occurred, defaulting to eligible to maintain service availability.');
      return {
        isEligible: true,
        reason: 'eligible'
      };
    }

    // If user has ANY conversions site-wide, they're ineligible for ALL future experiments
    if (siteWideConversions && siteWideConversions.length > 0) {
      console.log(`[UserEligibility] User ${userIdentifier} ineligible: already converted site-wide`);
      return {
        isEligible: false,
        reason: 'already_converted_site_wide',
        details: {
          previousConversions: siteWideConversions
        }
      };
    }

    // 2. If checking for specific experiment, also check recent impressions to prevent spam
    if (experimentId) {
      try {
        const { data: recentImpressions, error: impressionError } = await supabase
          .from('impressions')
          .select('impression_at')  // Fix: Use impression_at instead of created_at
          .eq('user_identifier', userIdentifier)
          .eq('experiment_id', experimentId)
          .gte('impression_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes
          .limit(1);

        if (impressionError) {
          console.error('[UserEligibility] Error checking recent impressions:', impressionError);
          // Don't fail the entire eligibility check for impression errors
        } else if (recentImpressions && recentImpressions.length > 0) {
          return {
            isEligible: false,
            reason: 'duplicate_impression',
            details: {
              lastImpressionAt: recentImpressions[0].impression_at
            }
          };
        }
      } catch (impressionCheckError) {
        console.warn('[UserEligibility] Failed to check recent impressions, continuing with eligibility check:', impressionCheckError);
        // Don't fail entire eligibility check for this
      }
    }

    // User is eligible
    return {
      isEligible: true,
      reason: 'eligible'
    };

  } catch (error) {
    console.error('[UserEligibility] Unexpected error in eligibility check:', error);
    console.warn('[UserEligibility] Defaulting to eligible to maintain A/B testing service availability.');
    
    // On any unexpected error, default to eligible to avoid blocking legitimate users
    // It's better to have slightly less precise A/B testing than broken A/B testing
    return {
      isEligible: true,
      reason: 'eligible'
    };
  }
}

/**
 * Track engagement for ineligible users separately from A/B testing
 * This maintains UX insights without contaminating experiment data
 * Fails gracefully on network errors to prevent disruption
 */
export async function trackIneligibleUserEngagement(
  userIdentifier: string,
  experimentName: string,
  variantName: string,
  pageUrl: string,
  engagementType: 'page_view' | 'quiz_start' | 'quiz_complete' | 'conversion_attempt' = 'page_view'
): Promise<void> {
  try {
    // Insert into a separate engagement tracking table (or metadata field)
    const { error } = await supabase
      .from('user_engagement_tracking')
      .insert({
        user_identifier: userIdentifier,
        engagement_type: engagementType,
        experiment_context: experimentName,
        variant_context: variantName,
        page_url: pageUrl,
        metadata: {
          user_status: 'return_converter',
          tracking_purpose: 'engagement_analytics',
          excluded_from_ab_testing: true
        }
      });

    if (error) {
      // Check if this is a network connectivity issue
      if (error.message?.includes('NetworkError') || 
          error.message?.includes('fetch') ||
          error.message?.includes('network') ||
          error.code === '' || error.code === 'NETWORK_ERROR') {
        console.warn('[UserEligibility] Network issue while tracking ineligible user engagement. Service continues normally.');
        return;
      }
      
      // For other errors (like table doesn't exist), log but don't break
      console.warn('[UserEligibility] Error tracking ineligible user engagement (non-critical):', error);
    } else {
      console.log(`[UserEligibility] Tracked engagement for ineligible user: ${engagementType}`);
    }
  } catch (error) {
    // Network or other errors should not break A/B testing functionality
    console.warn('[UserEligibility] Non-critical error tracking engagement for ineligible user:', error);
  }
}

/**
 * Enhanced conversion tracking that handles return users elegantly
 * For quiz completions by return users, we track engagement but not conversion
 */
export async function handleReturnUserConversion(
  userIdentifier: string,
  variantId: string,
  conversionType: string,
  conversionValue?: number,
  details?: Record<string, unknown>
): Promise<{ tracked: boolean; reason: string }> {
  
  const eligibility = await checkUserEligibilityForABTesting(userIdentifier);
  
  if (!eligibility.isEligible && eligibility.reason === 'already_converted_site_wide') {
    // This is a return user who has already converted
    // Track as engagement, not as A/B test conversion
    
    await supabase.from('user_engagement_tracking').insert({
      user_identifier: userIdentifier,
      engagement_type: 'repeat_conversion',
      metadata: {
        original_variant_id: variantId,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        details: details,
        user_status: 'return_converter',
        tracking_purpose: 'engagement_analytics',
        excluded_from_ab_testing: true
      }
    });
    
    return {
      tracked: false,
      reason: 'Tracked as engagement for return converter, not as A/B test conversion'
    };
  }
  
  // User is eligible, proceed with normal conversion tracking
  return {
    tracked: true,
    reason: 'User eligible for A/B test conversion tracking'
  };
} 