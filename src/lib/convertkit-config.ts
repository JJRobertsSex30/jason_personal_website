// src/lib/convertkit-config.ts
// Unified ConvertKit configuration for consistent tagging across all entry points
import type { KitSubscriber } from '~/types';

export interface SubscriberUpdatePayload {
  first_name?: string;
  email_address?: string;
  fields?: Record<string, string | number | boolean | null>;
}

export interface ConvertKitConfig {
  sourceTagIds: Record<string, number>;
  resultTagIds: Record<string, number>;
  engagementTagIds: Record<string, number>;
  getSourceTags: (source: SubscriptionSource) => number[];
  getResultTags: (resultType: string) => number[];
  getEngagementTags: (data: EngagementData) => number[];
}

export type SubscriptionSource = 'hero' | 'quiz' | 'quiz-lovelab' | 'quiz-v1' | 'subscribe-box' | 'general-signup' | 'footer-form' | 'contact-form' | 'webinar-signup' | 'resource-download';

export interface EngagementData {
  score?: number;
  gems?: number;
  hasReferral?: boolean;
}

// ConvertKit Tag IDs - Update these with your actual tag IDs
export const CONVERTKIT_TAG_IDS = {
  // Source tags (create these in ConvertKit)
  source_hero: 8126106,           // Hero signup
  source_quiz: 8126109,           // Love lab quiz 1 page
  source_lovelab: 8126111,        // Love lab quiz 2 pages
  
  // Result tags (your old acc ones)
  // result_sex_30_leaning: 7939502,     // 'Leaning Towards Sex 3.0'
  // result_sex_20_mostly: 7939497,      // 'Mostly Sex 2.0'
  // result_sex_30_mostly: 7939504,      // 'Mostly Sex 3.0'
  // result_sex_20_awareness: 7939500,   // 'Sex 2.0 with Growing Awareness'
  
  // Result tags (your existing ones)
  result_sex_30_leaning: 8126010,     // 'Leaning Towards Sex 3.0'
  result_sex_20_mostly: 8126007,      // 'Mostly Sex 2.0'
  result_sex_30_mostly: 8126011,      // 'Mostly Sex 3.0'
  result_sex_20_awareness: 8126008,   // 'Sex 2.0 with Growing Awareness'
  


  // Engagement tags (create these in ConvertKit)
  high_scorer: 8126022,           // Score > 80
  gem_collector: 8126025,         // Gems > 100
  referrer: 8126027,              // Has referral activity
  email_verified: 8126029,        // Email verified via webhook
};

// Map quiz results to tag IDs
const RESULT_TYPE_TO_TAG_ID: Record<string, number> = {
  'Leaning Towards Sex 3.0': CONVERTKIT_TAG_IDS.result_sex_30_leaning,
  'Mostly Sex 2.0': CONVERTKIT_TAG_IDS.result_sex_20_mostly,
  'Mostly Sex 3.0': CONVERTKIT_TAG_IDS.result_sex_30_mostly,
  'Sex 2.0 with Growing Awareness': CONVERTKIT_TAG_IDS.result_sex_20_awareness,
};

// ConvertKit configuration
export const convertKitConfig: ConvertKitConfig = {
  sourceTagIds: {
    hero: CONVERTKIT_TAG_IDS.source_hero,
    quiz: CONVERTKIT_TAG_IDS.source_quiz,
    'quiz-lovelab': CONVERTKIT_TAG_IDS.source_lovelab,
  },
  
  resultTagIds: RESULT_TYPE_TO_TAG_ID,
  
  engagementTagIds: {
    high_scorer: CONVERTKIT_TAG_IDS.high_scorer,
    gem_collector: CONVERTKIT_TAG_IDS.gem_collector,
    referrer: CONVERTKIT_TAG_IDS.referrer,
    email_verified: CONVERTKIT_TAG_IDS.email_verified,
  },
  
  getSourceTags: (source: SubscriptionSource): number[] => {
    const sourceTag = convertKitConfig.sourceTagIds[source];
    return sourceTag ? [sourceTag] : [];
  },
  
  getResultTags: (resultType: string): number[] => {
    const resultTag = convertKitConfig.resultTagIds[resultType];
    return resultTag ? [resultTag] : [];
  },
  
  getEngagementTags: (data: EngagementData): number[] => {
    const tags: number[] = [];
    
    if (data.score && data.score > 80) {
      tags.push(convertKitConfig.engagementTagIds.high_scorer);
    }
    
    if (data.gems && data.gems > 100) {
      tags.push(convertKitConfig.engagementTagIds.gem_collector);
    }
    
    return tags;
  },
};

// This payload is created by our helper and sent to the /forms/:id/subscribe endpoint
export interface FormSubscribePayload {
  email_address: string;
  first_name?: string;
  fields?: Record<string, string>;
  tags?: number[];
}

// Helper function to create ConvertKit payload
export function createConvertKitPayload(
  email: string,
  source: SubscriptionSource,
  options: {
    firstName?: string;
    resultType?: string;
    score?: number;
    gems?: number;
    referralId?: string;
    customFields?: Record<string, string>;
  } = {}
): FormSubscribePayload {
  // Collect all tags
  const sourceTags = convertKitConfig.getSourceTags(source);
  const resultTags = options.resultType ? convertKitConfig.getResultTags(options.resultType) : [];
  const engagementTags = convertKitConfig.getEngagementTags({
    score: options.score,
    gems: options.gems,
    hasReferral: !!options.referralId,
  });
  
  const allTags = [...sourceTags, ...resultTags, ...engagementTags];
  
  // Build fields object
  const fields: Record<string, string> = {
    signup_source: source,
    signup_timestamp: new Date().toISOString(),
    ...options.customFields,
  };
  
  // Add quiz-specific fields
  if (source.includes('quiz')) {
    if (options.score !== undefined) {
      fields.love_lab_quiz_score = options.score.toString();
    }
    if (options.resultType) {
      fields.quiz_result_type = options.resultType;
    }
    if (options.gems !== undefined) {
      fields.insight_gems = options.gems.toString();
    }
    if (options.referralId) {
      fields.referral_id = options.referralId;
    }
    fields.quiz_taken_at = new Date().toISOString();
  }
  
  return {
    email_address: email.toLowerCase().trim(),
    first_name: options.firstName,
    fields,
    tags: allTags.length > 0 ? allTags : undefined,
  };
}

// Helper function to submit to ConvertKit
export async function submitToConvertKit(
  payload: FormSubscribePayload,
  formId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const convertKitFormId = formId || import.meta.env.PUBLIC_CONVERTKIT_FORM_ID;
    const apiKey = import.meta.env.CONVERTKIT_API_KEY;

    if (!convertKitFormId || !apiKey) {
      throw new Error('ConvertKit form ID or API Key not configured');
    }
    
    const convertKitApiUrl = `https://api.kit.com/v4/forms/${convertKitFormId}/subscribe`;
    
    // Log the payload being sent to ConvertKit
    console.log('[ConvertKit] Submitting to form ' + convertKitFormId + ' with payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(convertKitApiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': apiKey
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ConvertKit API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    
    const result = await response.json();
    console.log('ConvertKit submission successful:', result);
    
    return { success: true };
  } catch (error) {
    console.error('ConvertKit submission failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getConvertKitSubscriberByEmail(email: string): Promise<{ success: boolean; data?: KitSubscriber; error?: string }> {
  const apiKey = import.meta.env.CONVERTKIT_API_KEY;

  if (!apiKey) {
    console.error('[ConvertKit] API Key not found. Cannot fetch subscriber.');
    return { success: false, error: 'API credentials not configured.' };
  }

  const url = `https://api.kit.com/v4/subscribers?email_address=${encodeURIComponent(email)}`;

  try {
    console.log(`[ConvertKit] Fetching subscriber data for: ${email}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Kit-Api-Key': apiKey
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData.error && responseData.message
        ? `${responseData.error}: ${responseData.message}`
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        : responseData.error_message || `HTTP error ${response.status}`;
      console.error(`[ConvertKit] Error fetching subscriber ${email}: ${errorMessage}`, responseData);
      return { success: false, error: errorMessage, data: responseData };
    }
    
    // The API returns an array of subscribers, even when querying by unique email.
    if (responseData.subscribers && responseData.subscribers.length > 0) {
      // Assuming the first result is the correct one for a unique email query.
      const subscriber: KitSubscriber = responseData.subscribers[0];
      console.log(`[ConvertKit] Successfully fetched subscriber data for ${email}. ID: ${subscriber.id}`);
      return { success: true, data: subscriber };
    } else {
      console.log(`[ConvertKit] Subscriber not found for email: ${email}`);
      return { success: false, error: 'Subscriber not found.' };
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ConvertKit] An unexpected error occurred while fetching subscriber ${email}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// NEW ConvertKit Helper Functions Start

/**
 * Adds a specific tag to a ConvertKit subscriber.
 */
export async function addTagToSubscriber(
  email: string,
  tagId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriberResult = await getConvertKitSubscriberByEmail(email);
    if (!subscriberResult.success || !subscriberResult.data) {
      return { success: false, error: subscriberResult.error || 'Subscriber not found.' };
    }

    const subscriberId = subscriberResult.data.id;
    const apiKey = import.meta.env.CONVERTKIT_API_KEY;
    // V4: Use POST to /subscribers/:id with api_key in query
    const url = `https://api.kit.com/v4/tags/${tagId}/subscribers/${subscriberId}`;

    const response = await fetch(url, {
      method: 'POST', // Body should be empty for this endpoint
      headers: {
        'X-Kit-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ConvertKit API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    console.log(`[ConvertKit] Successfully tagged subscriber ${email} with tag ${tagId}.`);
    return { success: true };
  } catch (error) {
    console.error('ConvertKit tag addition failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Removes a specific tag from a ConvertKit subscriber.
 * Note: ConvertKit API uses "unsubscribe" from a tag to remove it.
 */
export async function removeTagFromSubscriber(
  email: string,
  tagId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriberResult = await getConvertKitSubscriberByEmail(email);
    if (!subscriberResult.success || !subscriberResult.data) {
      return { success: false, error: subscriberResult.error || 'Subscriber not found.' };
    }

    const subscriberId = subscriberResult.data.id;
    const apiKey = import.meta.env.CONVERTKIT_API_KEY;
    const url = `https://api.kit.com/v4/tags/${tagId}/subscribers/${subscriberId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Kit-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ConvertKit API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    console.log(`[ConvertKit] Successfully removed tag ${tagId} from subscriber ${email}.`);
    return { success: true };
  } catch (error) {
    console.error('ConvertKit tag removal failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Updates the first_name of a ConvertKit subscriber.
 * This is achieved by re-subscribing to the default public form with the new first_name.
 */
export async function updateSubscriberFirstName(
  email: string,
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriberResult = await getConvertKitSubscriberByEmail(email);
    if (!subscriberResult.success || !subscriberResult.data) {
      return { success: false, error: subscriberResult.error || 'Subscriber not found.' };
    }

    const subscriberId = subscriberResult.data.id;
    const apiKey = import.meta.env.CONVERTKIT_API_KEY;
    // V4: Use PUT with api_key in query string
    const url = `https://api.kit.com/v4/subscribers/${subscriberId}`;

    const payload: { first_name: string } = {
      first_name: firstName,
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': apiKey
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ConvertKit API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    console.log(`[ConvertKit] Successfully updated first name for subscriber ${email}.`);
    return { success: true };
  } catch (error) {
    console.error('ConvertKit first name update failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// NEW ConvertKit Helper Functions End