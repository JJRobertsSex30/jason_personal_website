import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
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
  userProfileId: string,
): Promise<UserEligibilityResult> {
  // This check is only for authenticated users. Anonymous users are always considered eligible for their first impression.
  if (!userProfileId) {
      // This case should ideally not be hit if called correctly, but as a safeguard:
      return { isEligible: true, reason: 'eligible' };
  }

  try {
    // Check for ANY site-wide conversions for this user. If a user has ever converted,
    // they are no longer eligible for any new A/B test impressions.
    const { data: siteWideConversions, error: conversionError } = await supabase
      .from('conversions')
      .select('experiment_id, variant_id, conversion_type, created_at')
      .eq('user_profile_id', userProfileId)
      .limit(1); // We only need to know if at least one conversion exists.

    if (conversionError) {
      console.error('[UserEligibility] Error checking site-wide conversions:', conversionError);
      // On network or database error, default to eligible to avoid blocking legitimate users.
      // It's better to have slightly imprecise A/B data than a broken user experience.
      return { isEligible: true, reason: 'eligible' };
    }

    // If user has ANY conversions site-wide, they're ineligible for ALL future experiments.
    if (siteWideConversions && siteWideConversions.length > 0) {
      console.log(`[UserEligibility] User ${userProfileId} ineligible: already converted site-wide.`);
      return {
        isEligible: false,
        reason: 'already_converted_site_wide',
        details: {
          previousConversions: siteWideConversions
        }
      };
    }

    // If no conversions are found, the user is eligible for new experiments.
    return { isEligible: true, reason: 'eligible' };

  } catch (error) {
    console.error('[UserEligibility] Unexpected error in eligibility check:', error);
    // On any unexpected error, default to eligible to maintain service availability.
    return { isEligible: true, reason: 'eligible' };
  }
}

/**
 * Track engagement for ineligible users separately from A/B testing
 * This maintains UX insights without contaminating experiment data
 * Fails gracefully on network errors to prevent disruption
 */
export async function trackIneligibleUserEngagement(
  user_id: string,
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
        user_id: user_id,
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
  user_id: string,
  variantId: string,
  conversionType: string,
  conversionValue?: number,
  details?: Record<string, unknown>
): Promise<{ tracked: boolean; reason: string }> {
  
  const eligibility = await checkUserEligibilityForABTesting(user_id);
  
  if (!eligibility.isEligible && eligibility.reason === 'already_converted_site_wide') {
    // This is a return user who has already converted
    // Track as engagement, not as A/B test conversion
    
    await supabase.from('user_engagement_tracking').insert({
      user_id: user_id,
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

export const checkUserExperimentParticipation = async (
  supabase: SupabaseClient,
  user_id: string,
  experiment_id: string
): Promise<{ participated: boolean; variant_id: string | null }> => {
  const { data } = await supabase
    .from('user_experiment_participation')
    .select('variant_id')
    .eq('user_id', user_id)
    .eq('experiment_id', experiment_id)
    .single();

  return {
    participated: data !== null,
    variant_id: data ? data.variant_id : null
  };
};

export const checkUserConversionForExperiment = async (
  supabase: SupabaseClient,
  user_id: string,
  experiment_id: string
): Promise<boolean> => {
  const { data, count } = await supabase
    .from('conversions')
    .select('id', { count: 'exact' })
    .eq('user_id', user_id)
    .eq('experiment_id', experiment_id);

  return (data && data.length > 0) || (count !== null && count > 0);
};

export const recordUserParticipation = async (
  supabase: SupabaseClient,
  user_id: string,
  experiment_id: string,
  variant_id: string
): Promise<{ success: boolean; error?: PostgrestError }> => {
  const { error } = await supabase
    .from('user_experiment_participation')
    .insert({
      user_id: user_id,
      experiment_id,
      variant_id,
    });

  return {
    success: error === null,
    error: error || undefined
  };
};

export const recordConversion = async (
  supabase: SupabaseClient,
  user_id: string,
  experiment_id: string,
  variant_id: string,
  conversion_type: string,
  value?: number
): Promise<{ success: boolean; error?: PostgrestError }> => {
  const { error } = await supabase.from('conversions').insert({
    user_id: user_id,
    experiment_id,
    variant_id,
    conversion_type,
    conversion_value: value,
  });

  return {
    success: error === null,
    error: error || undefined
  };
}; 