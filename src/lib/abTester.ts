console.log('[abTester.ts] Module loading/starting...');

import { supabase } from './supabaseClient'; // Ensure this path is correct
import { checkUserEligibilityForABTesting, trackIneligibleUserEngagement } from './userEligibility';

export interface ABVariant {
  id: string; 
  name: string; 
  experiment_id: string; // UUID of the parent experiment
  headline: string; 
  subheadline: string; 
  raw_config_json?: Record<string, unknown> | null; 
}

// Payload for the 'impressions' table
interface ImpressionPayload {
  variant_id: string;
  user_identifier: string;
  experiment_id: string;
  session_identifier?: string | null;
  page_url?: string | null;
  user_agent?: string | null;
  // Geographic & Location
  country_code?: string | null;
  region?: string | null;
  city?: string | null;
  language_code?: string | null;
  time_zone?: string | null;
  // Device & Technical
  device_type?: 'desktop' | 'mobile' | 'tablet' | null;
  screen_resolution?: string | null;
  viewport_size?: string | null;
  connection_type?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | null;
  // Performance
  page_load_time?: number | null;
  // Marketing & UTM
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  // Engagement
  time_on_page?: number | null;
  scroll_depth_percent?: number | null;
  bounce?: boolean | null;
  is_first_exposure?: boolean | null;
  // A/B Testing Context
  user_was_eligible?: boolean | null;
  user_eligibility_status?: Record<string, unknown> | null;
  user_context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  // created_at is typically handled by DB default (e.g., DEFAULT NOW())
}

// Payload for the 'conversions' table
interface ConversionPayload {
  variant_id: string;
  experiment_id: string;
  user_identifier: string;
  conversion_type: string;
  details?: Record<string, unknown> | null;
  session_identifier?: string | null;
  // Enhanced fields to match conversions table schema
  country_code?: string | null;
  device_type?: 'desktop' | 'mobile' | 'tablet' | null;
  referrer_source?: string | null;
  time_to_convert?: number | null;
  conversion_value?: number | null;
  conversion_eligibility_verified?: boolean | null;
  conversion_context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  original_exposure_date?: string | null; // ISO string
  // Additional comprehensive fields
  page_url?: string | null;
  user_agent?: string | null;
  region?: string | null;
  city?: string | null;
  language_code?: string | null;
  time_zone?: string | null;
  screen_resolution?: string | null;
  viewport_size?: string | null;
  connection_type?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  // created_at is typically handled by DB default
}

function parseVariantConfig(config: Record<string, unknown> | null | undefined, variantName: string): { headline: string, subheadline: string } {
  const defaults = {
    headline: `Default Headline for ${variantName}`,
    subheadline: `Default subheadline for ${variantName}. Configure in DB.`
  };
  if (!config) {
    // console.warn(`[abTester] No config provided for variant ${variantName}, using defaults.`);
    return defaults;
  }
  return {
    headline: typeof config.headline === 'string' ? config.headline : defaults.headline,
    subheadline: typeof config.subheadline === 'string' ? config.subheadline : defaults.subheadline,
  };
}

async function fetchExperimentVariants(experimentName: string): Promise<ABVariant[]> {
  console.log(`[abTester] Fetching variants for experiment name: "${experimentName}"`);
  const { data: expData, error: expError } = await supabase
    .from('experiments')
    .select('id, name') // We need the experiment's UUID (id)
    .eq('name', experimentName)
    .eq('is_active', true)
    .maybeSingle();

  if (expError) {
    console.error(`[abTester] DB error fetching experiment by name "${experimentName}". Error:`, expError.message);
    return [];
  }

  if (!expData) {
    console.warn(`[abTester] No active experiment found with name "${experimentName}".`);
    return [];
  }

  const experimentId = expData.id; // This is the UUID of the experiment
  console.log(`[abTester] Found active experiment "${experimentName}" with ID: ${experimentId}. Fetching its variants.`);

  const { data: variantsData, error: variantsError } = await supabase
    .from('variants') // Assuming your variants table is named 'variants'
    .select('id, name, experiment_id, description, config_json') 
    .eq('experiment_id', experimentId);

  if (variantsError) {
    console.error(`[abTester] Error fetching variants for experiment ID "${experimentId}":`, variantsError.message);
    return [];
  }

  if (!variantsData || variantsData.length === 0) {
    console.warn(`[abTester] No variants found for experiment "${experimentName}" (ID: ${experimentId}).`);
    return [];
  }
  
  return variantsData.map(v => {
    const config = parseVariantConfig(v.config_json as Record<string, unknown> | null, v.name);
    return {
      id: v.id, // Variant's UUID
      name: v.name, // Variant's textual name (e.g., 'A', 'B')
      experiment_id: v.experiment_id, // Experiment's UUID (should match experimentId from above)
      headline: config.headline,
      subheadline: config.subheadline,
      raw_config_json: v.config_json as Record<string, unknown> | null,
    };
  });
}

function getClientUserIdentifier(): string {
  if (typeof localStorage === 'undefined') {
    console.warn("[abTester] Client user identifier requested in non-browser environment. Generating transient ID.");
    return 'client_anon_ssr_' + crypto.randomUUID(); 
  }
  let userId = localStorage.getItem('ab_user_identifier');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('ab_user_identifier', userId);
    console.log('[abTester] New client user identifier generated and stored:', userId);
  }
  return userId;
}

// This function will be exposed on window
function getClientSessionIdentifier(): string | null {
  if (typeof sessionStorage === 'undefined') {
    console.warn("[abTester] Client session identifier requested in non-browser environment.");
    return null;
  }
  let sessionId = sessionStorage.getItem('ab_session_identifier');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('ab_session_identifier', sessionId);
    console.log('[abTester] New client session identifier generated and stored:', sessionId);
  }
  return sessionId;
}

// Analytics data collection helpers
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' | null {
  if (typeof window === 'undefined') return null;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  
  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

function getScreenResolution(): string | null {
  if (typeof window === 'undefined' || !window.screen) return null;
  return `${window.screen.width}x${window.screen.height}`;
}

function getViewportSize(): string | null {
  if (typeof window === 'undefined') return null;
  return `${window.innerWidth}x${window.innerHeight}`;
}

function getConnectionType(): 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | null {
  if (typeof navigator === 'undefined') {
    console.log('[abTester] getConnectionType: navigator undefined (SSR context)');
    return null;
  }
  
  // Check for connection API availability
  const hasConnectionAPI = 'connection' in navigator;
  const hasMozConnection = 'mozConnection' in navigator;
  const hasWebkitConnection = 'webkitConnection' in navigator;
  
  console.log('[abTester] Connection API availability:', {
    connection: hasConnectionAPI,
    mozConnection: hasMozConnection,
    webkitConnection: hasWebkitConnection
  });
  
  if (!hasConnectionAPI && !hasMozConnection && !hasWebkitConnection) {
    console.log('[abTester] getConnectionType: No connection API available, attempting fallback detection');
    
    // Fallback: Use user agent and heuristics
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      console.log('[abTester] getConnectionType: Mobile device detected, defaulting to 4g');
      return '4g'; // Most mobile devices are on 4G or better
    } else {
      console.log('[abTester] getConnectionType: Desktop device detected, defaulting to wifi');
      return 'wifi'; // Most desktop devices use WiFi or ethernet
    }
  }
  
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string; downlink?: number } }).connection || 
                    (navigator as Navigator & { mozConnection?: { effectiveType?: string; type?: string; downlink?: number } }).mozConnection || 
                    (navigator as Navigator & { webkitConnection?: { effectiveType?: string; type?: string; downlink?: number } }).webkitConnection;
  
  if (!connection) {
    console.log('[abTester] getConnectionType: Connection object not available');
    return null;
  }
  
  console.log('[abTester] Connection object details:', {
    effectiveType: connection.effectiveType,
    type: connection.type,
    downlink: connection.downlink
  });
  
  const effectiveType = connection.effectiveType;
  
  // Map effectiveType to our enum values, with fallbacks
  switch (effectiveType) {
    case 'slow-2g':
      console.log('[abTester] getConnectionType: detected slow-2g');
      return 'slow-2g';
    case '2g':
      console.log('[abTester] getConnectionType: detected 2g');
      return '2g';
    case '3g':
      console.log('[abTester] getConnectionType: detected 3g');
      return '3g';
    case '4g':
      console.log('[abTester] getConnectionType: detected 4g');
      return '4g';
    default: {
      // Fallback to connection type if effectiveType is not recognized
      const type = connection.type;
      console.log('[abTester] getConnectionType: effectiveType not recognized, checking type:', type);
      
      switch (type) {
        case 'wifi':
          console.log('[abTester] getConnectionType: detected wifi');
          return 'wifi';
        case 'ethernet':
          console.log('[abTester] getConnectionType: detected ethernet');
          return 'ethernet';
        case 'cellular':
          console.log('[abTester] getConnectionType: cellular detected, defaulting to 4g');
          return '4g';
        default: {
          // Use downlink speed as fallback if available
          if (connection.downlink !== undefined) {
            const downlink = connection.downlink;
            console.log('[abTester] getConnectionType: using downlink speed for detection:', downlink, 'Mbps');
            
            if (downlink >= 10) return '4g';
            if (downlink >= 1.5) return '3g';
            if (downlink >= 0.15) return '2g';
            return 'slow-2g';
          }
          
          console.log('[abTester] getConnectionType: falling back to 4g (unknown type)');
          return '4g'; // Safe fallback
        }
      }
    }
  }
}

function getLanguageCode(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || null;
}

function getTimeZone(): string | null {
  if (typeof Intl === 'undefined') return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function getPageLoadTime(): number | null {
  if (typeof performance === 'undefined' || !performance.timing) return null;
  
  const timing = performance.timing;
  if (timing.loadEventEnd && timing.navigationStart) {
    return timing.loadEventEnd - timing.navigationStart;
  }
  
  // Fallback to performance.now() if available
  if (performance.now) {
    return Math.round(performance.now());
  }
  
  return null;
}

function getUTMParameters(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  
  // Helper function to get non-empty parameter or undefined
  const getParam = (key: string): string | undefined => {
    const value = urlParams.get(key);
    return value && value.trim() !== '' ? value.trim() : undefined;
  };
  
  return {
    utm_source: getParam('utm_source'),
    utm_medium: getParam('utm_medium'),
    utm_campaign: getParam('utm_campaign'),
  };
}

function checkIsFirstExposure(experimentId: string): boolean {
  if (typeof localStorage === 'undefined') return true;
  
  const exposureKey = `ab_first_exposure_${experimentId}`;
  const timestampKey = `ab_first_exposure_time_${experimentId}`;
  const hasBeenExposed = localStorage.getItem(exposureKey);
  
  console.log(`[abTester] checkIsFirstExposure: Experiment ${experimentId}, hasBeenExposed: ${hasBeenExposed}`);
  
  if (!hasBeenExposed) {
    const currentTimestamp = Date.now();
    localStorage.setItem(exposureKey, 'true');
    localStorage.setItem(timestampKey, currentTimestamp.toString());
    
    console.log(`[abTester] checkIsFirstExposure: Set first exposure timestamp for experiment ${experimentId}: ${currentTimestamp}`);
    
    return true;
  }
  
  // Even if not first exposure, ensure timestamp exists (recovery mechanism)
  const existingTimestamp = localStorage.getItem(timestampKey);
  if (!existingTimestamp) {
    const recoveryTimestamp = Date.now();
    localStorage.setItem(timestampKey, recoveryTimestamp.toString());
    
    console.log(`[abTester] checkIsFirstExposure: Recovery - Set missing timestamp for experiment ${experimentId}: ${recoveryTimestamp}`);
  } else {
    console.log(`[abTester] checkIsFirstExposure: Existing timestamp found for experiment ${experimentId}: ${existingTimestamp}`);
  }
  
  return false;
}

function getScrollDepthPercent(): number {
  if (typeof window === 'undefined') return 0;
  
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const documentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  
  if (documentHeight <= 0) return 100;
  
  return Math.round((scrollTop / documentHeight) * 100);
}

// Enhanced metadata collection
function getBrowserMetadata(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  
  return {
    browser_features: {
      local_storage: typeof localStorage !== 'undefined',
      session_storage: typeof sessionStorage !== 'undefined', 
      performance_api: typeof performance !== 'undefined',
      connection_api: 'connection' in navigator,
      intl_api: typeof Intl !== 'undefined',
      geolocation_api: 'geolocation' in navigator,
      touch_support: 'ontouchstart' in window
    },
    page_info: {
      title: document.title,
      referrer: document.referrer || null,
      url_hash: window.location.hash || null,
      url_pathname: window.location.pathname,
      url_search: window.location.search || null
    },
    document_info: {
      ready_state: document.readyState,
      visibility_state: document.visibilityState || null
    }
  };
}

// Global variables for engagement tracking
let pageLoadStartTime: number | null = null;
let hasUserInteracted = false;

// Initialize engagement tracking
if (typeof window !== 'undefined') {
  pageLoadStartTime = Date.now();
  
  // Track user interactions to detect bounce
  const interactionEvents = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
  const markInteraction = () => {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      interactionEvents.forEach(event => {
        document.removeEventListener(event, markInteraction);
      });
    }
  };
  
  interactionEvents.forEach(event => {
    document.addEventListener(event, markInteraction, { passive: true, once: true });
  });
}

export async function getVariant(experimentName: string): Promise<ABVariant> {
  console.log(`[abTester] getVariant called for experiment name: "${experimentName}"`);
  const activeVariants = await fetchExperimentVariants(experimentName);

  if (!activeVariants || activeVariants.length === 0) {
    console.error(`[abTester] No active variants for experiment '${experimentName}'. Returning fallback variant.`);
    return { 
      id: 'fallback_no_variants', 
      name: 'Fallback', 
      experiment_id: 'unknown_experiment_id', // Fallback experiment_id
      headline: 'Error: Experiment Not Configured', 
      subheadline: 'Please check A/B test setup or ensure experiment is active.', 
      raw_config_json: {}
    };
  }

  let chosenVariant: ABVariant | undefined;
  if (typeof localStorage !== 'undefined') {
    const localStorageKey = `ab_variant_${experimentName}`; // Use experiment name for key
    const storedVariantId = localStorage.getItem(localStorageKey);
    if (storedVariantId) {
      chosenVariant = activeVariants.find(v => v.id === storedVariantId);
      if (chosenVariant) {
        // console.log(`[abTester] Using stored variant "${chosenVariant.name}" (ID: ${chosenVariant.id}) for experiment "${experimentName}"`);
      } else {
        console.warn(`[abTester] Stored variant ID "${storedVariantId}" not found in active variants for "${experimentName}". Clearing stored key.`);
        localStorage.removeItem(localStorageKey);
      }
    }
    if (!chosenVariant) {
      const randomIndex = Math.floor(Math.random() * activeVariants.length);
      chosenVariant = activeVariants[randomIndex];
      localStorage.setItem(localStorageKey, chosenVariant.id);
      console.log(`[abTester] Randomly selected and stored variant "${chosenVariant.name}" (ID: ${chosenVariant.id}) for experiment "${experimentName}"`);
    }
  } else {
    // SSR or non-browser environment
    const randomIndex = Math.floor(Math.random() * activeVariants.length);
    chosenVariant = activeVariants[randomIndex];
    console.log(`[abTester] SSR/Non-browser: Randomly selected variant "${chosenVariant.name}" (ID: ${chosenVariant.id}) for experiment "${experimentName}"`);
  }
  
  // Ensure chosenVariant is always defined if activeVariants has items
  return chosenVariant || activeVariants[0]; 
}

export async function logClientImpression(variant: ABVariant | null, experimentNameFromContext?: string) {
  if (typeof window === 'undefined') {
    return; 
  }
  if (!variant || variant.id === 'fallback_no_variants') {
    console.log("[abTester] Impression logging skipped: Invalid or fallback variant provided.");
    return;
  }
  
  if (!variant.experiment_id || variant.experiment_id === 'unknown_experiment_id') {
      console.error(`[abTester] Cannot log impression: Missing valid experiment_id on variant object. Experiment context: "${experimentNameFromContext || 'N/A'}". Variant:`, variant);
      return;
  }

  const userIdentifier = getClientUserIdentifier();
  const sessionIdentifier = getClientSessionIdentifier();
  
  // ALWAYS ensure first exposure timestamp is set, regardless of eligibility or deduplication
  // This is critical for time_to_convert calculations
  console.log(`[abTester] logClientImpression: Ensuring first exposure timestamp for experiment ${variant.experiment_id}`);
  const isFirstExposure = checkIsFirstExposure(variant.experiment_id);
  
  // Check user eligibility for A/B testing
  const eligibility = await checkUserEligibilityForABTesting(userIdentifier, variant.experiment_id);
  
  console.log(`[abTester] IMPRESSION ELIGIBILITY CHECK: User: ${userIdentifier}, Experiment: ${variant.experiment_id}, Eligible: ${eligibility.isEligible}, Reason: ${eligibility.reason}`);
  
  if (!eligibility.isEligible) {
    console.log(`[abTester] 🚫 IMPRESSION BLOCKED - User ${userIdentifier} not eligible for A/B testing: ${eligibility.reason}`);
    
    // Track engagement separately for analytics purposes
    await trackIneligibleUserEngagement(
      userIdentifier,
      experimentNameFromContext || 'unknown_experiment',
      variant.name,
      window.location.href,
      'page_view'
    );
    
    return; // Don't log impression or assign to experiment
  }
  
  console.log(`[abTester] ✅ IMPRESSION ELIGIBLE - proceeding with impression logging for user ${userIdentifier}`);
  
  // Short-term deduplication (2 minutes) to prevent rapid refresh spam only
  const shortTermKey = `impression_recent_${variant.experiment_id}_${variant.id}_${Math.floor(Date.now() / 120000)}`; // 2-minute windows
  
  if (sessionStorage.getItem(shortTermKey)) {
    console.log(`[abTester] Impression for variant "${variant.name}" (ID: ${variant.id}) already logged in the last 2 minutes. Skipping to prevent spam.`);
    return;
  }

  console.log(`[abTester] Logging CLIENT IMPRESSION: Experiment ID: '${variant.experiment_id}', Variant ID: '${variant.id}', Name: '${variant.name}', User: '${userIdentifier}', Session: '${sessionIdentifier || 'N/A'}'`);
  
  // Collect comprehensive analytics data
  const utmParams = getUTMParameters();
  const timeOnPage = pageLoadStartTime ? Math.round((Date.now() - pageLoadStartTime) / 1000) : null;
  
  // Fetch geolocation data
  let geoData = {
    country_code: null as string | null,
    region: null as string | null,
    city: null as string | null
  };

  try {
    console.log('[abTester] Fetching geolocation data...');
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
        console.log('[abTester] Geolocation data retrieved:', geoData);
      } else {
        console.log('[abTester] Geolocation API returned no data');
      }
    } else {
      console.warn('[abTester] Geolocation API request failed:', geoResponse.status);
    }
  } catch (error) {
    console.warn('[abTester] Failed to fetch geolocation data:', error);
    // Continue with null values - non-blocking error
  }
  
  const impressionData: ImpressionPayload = {
    // Core A/B testing data
    variant_id: variant.id,
    user_identifier: userIdentifier,
    experiment_id: variant.experiment_id, 
    session_identifier: sessionIdentifier,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    
    // Geographic & Location (now populated via IP geolocation)
    country_code: geoData.country_code,
    region: geoData.region,  
    city: geoData.city,
    language_code: getLanguageCode(),
    time_zone: getTimeZone(),
    
    // Device & Technical
    device_type: getDeviceType(),
    screen_resolution: getScreenResolution(),
    viewport_size: getViewportSize(),
    connection_type: getConnectionType(),
    
    // Performance
    page_load_time: getPageLoadTime(),
    
    // Marketing & UTM
    utm_source: utmParams.utm_source || null,
    utm_medium: utmParams.utm_medium || null,
    utm_campaign: utmParams.utm_campaign || null,
    
    // Engagement
    time_on_page: timeOnPage,
    scroll_depth_percent: getScrollDepthPercent(),
    bounce: !hasUserInteracted,
    is_first_exposure: isFirstExposure,
    
    // A/B Testing Context
    user_was_eligible: eligibility.isEligible,
    user_eligibility_status: {
      reason: eligibility.reason,
      details: eligibility.details || {}
    },
    user_context: {
      experiment_name: experimentNameFromContext,
      variant_name: variant.name,
      user_identifier_type: 'ab_user_identifier'
    },
    metadata: {
      ...getBrowserMetadata(),
      geolocation_source: geoData.country_code ? 'ipgeolocation.io' : 'unavailable',
      collection_timestamp: new Date().toISOString(),
    }
  };

  const { error: impressionError } = await supabase
    .from('impressions')
    .insert(impressionData);

  if (impressionError) {
    if (impressionError.message.includes('created_at') && impressionError.message.includes('column') && impressionError.message.includes('does not exist')) {
        console.error(`[abTester] Supabase error logging client impression: The 'created_at' column might be missing or misconfigured in your 'impressions' table. Please ensure it exists and has a default value like NOW(). Original error:`, impressionError.message);
    } else {
        console.error('[abTester] Supabase error logging client impression:', impressionError.message, 'Details:', impressionError.details);
    }
  } else {
    sessionStorage.setItem(shortTermKey, 'true');
    console.log('[abTester] Client impression logged successfully to Supabase with comprehensive analytics data.');
  }
}

export async function trackConversion(
  variantId: string, 
  userIdentifierString: string, // Changed from userEmail to be more generic
  conversionType: string = 'generic_conversion',
  details?: Record<string, unknown>
): Promise<{ status: 'SUCCESS' | 'DUPLICATE' | 'ERROR' | 'INVALID_INPUT'; message: string }> {
  const sessionIdentifier = getClientSessionIdentifier();
  
  console.log(`[abTester] CLIENT CONVERSION ATTEMPT: Variant ID: '${variantId}', User: '${userIdentifierString}', Type: '${conversionType}', Session: '${sessionIdentifier || 'N/A'}', Details:`, details);
  
  if (!userIdentifierString || userIdentifierString.trim() === '' || !variantId) {
    const msg = '[abTester] User identifier and variant ID are required for conversion tracking.';
    console.error(msg);
    return { status: 'INVALID_INPUT', message: msg };
  }

  // Fetch experiment_id associated with the variantId
  const { data: variantRecord, error: variantError } = await supabase
    .from('variants')
    .select('experiment_id') 
    .eq('id', variantId)
    .single(); // Use single() as variantId should be unique and exist

  if (variantError || !variantRecord || !variantRecord.experiment_id) {
    const msg = `[abTester] Could not find a valid variant or its experiment_id for variant_id: ${variantId}. Conversion not logged. Error: ${variantError?.message || 'Variant not found or experiment_id missing'}`;
    console.error(msg);
    return { status: 'ERROR', message: msg };
  }
  const associatedExperimentId: string = variantRecord.experiment_id;

  // Check if user is eligible for A/B testing (FIXED: Use same logic as impressions)
  const eligibility = await checkUserEligibilityForABTesting(userIdentifierString, associatedExperimentId);
  
  console.log(`[abTester] CONVERSION ELIGIBILITY CHECK: User: ${userIdentifierString}, Experiment: ${associatedExperimentId}, Eligible: ${eligibility.isEligible}, Reason: ${eligibility.reason}`);
  
  if (!eligibility.isEligible) {
    console.log(`[abTester] 🚫 CONVERSION BLOCKED - user not eligible for A/B testing: ${eligibility.reason}`);
    
    // Track engagement separately for analytics purposes (like impressions do)
    await trackIneligibleUserEngagement(
      userIdentifierString,
      'conversion_attempt',
      variantId,
      typeof window !== 'undefined' ? window.location.href : 'unknown',
      'quiz_complete'
    );
    
    return { status: 'SUCCESS', message: `Conversion not tracked as A/B test data: ${eligibility.reason}` };
  }
  
  console.log(`[abTester] ✅ CONVERSION ELIGIBLE - proceeding with conversion tracking for user ${userIdentifierString}`);
  
  // Check for existing conversion for this user in this specific experiment, for this variant and type
  const { data: existingConversion, error: checkError } = await supabase
    .from('conversions')
    .select('id')
    .eq('experiment_id', associatedExperimentId)
    .eq('variant_id', variantId) 
    .eq('user_identifier', userIdentifierString)
    .eq('conversion_type', conversionType) 
    .limit(1)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = "Query result has no rows"
    const msg = `[abTester] Supabase error checking for existing conversion: ${checkError.message}`;
    console.error(msg);
    return { status: 'ERROR', message: msg }; 
  }

  if (existingConversion) {
    const msg = `[abTester] Conversion already logged for user '${userIdentifierString}', variant '${variantId}', type '${conversionType}'.`;
    console.log(msg);
    return { status: 'DUPLICATE', message: "Conversion already recorded for these parameters." };
  }

  console.log(`[abTester] Logging new conversion for user '${userIdentifierString}', variant '${variantId}', experiment '${associatedExperimentId}', type '${conversionType}'.`);

  // Collect comprehensive analytics data for conversion (same as impression tracking)
  const utmParams = getUTMParameters();
  
  // Fetch geolocation data
  let geoData = {
    country_code: null as string | null,
    region: null as string | null,
    city: null as string | null
  };

  try {
    console.log('[abTester] Conversion: Fetching geolocation data...');
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
        console.log('[abTester] Conversion: Geolocation data retrieved:', geoData);
      } else {
        console.log('[abTester] Conversion: Geolocation API returned no data');
      }
    } else {
      console.warn('[abTester] Conversion: Geolocation API request failed:', geoResponse.status);
    }
  } catch (error) {
    console.warn('[abTester] Conversion: Failed to fetch geolocation data:', error);
    // Continue with null values - non-blocking error
  }

  const conversionData: ConversionPayload = {
    variant_id: variantId, 
    experiment_id: associatedExperimentId,
    user_identifier: userIdentifierString,
    conversion_type: conversionType,
    details: details,
    session_identifier: sessionIdentifier,
    
    // Only fields that exist in conversions table schema
    country_code: geoData.country_code,
    device_type: getDeviceType(),
    referrer_source: getReferrerSource(),
    time_to_convert: calculateTimeToConvert(userIdentifierString, associatedExperimentId),
    conversion_value: details?.conversion_value as number || 1, // Default to 1 if not specified
    conversion_eligibility_verified: eligibility.isEligible,
    conversion_context: {
      variant_id: variantId,
      experiment_id: associatedExperimentId,
      user_identifier_type: 'ab_user_identifier',
      conversion_timestamp: new Date().toISOString(),
      client_info: {
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      }
    },
    utm_source: utmParams.utm_source || null,
    utm_medium: utmParams.utm_medium || null,
    utm_campaign: utmParams.utm_campaign || null,
    original_exposure_date: new Date().toISOString(),
    
    // Store additional data in metadata instead of non-existent columns
    metadata: {
      ...getBrowserMetadata(),
      geolocation_source: geoData.country_code ? 'ipgeolocation.io' : 'unavailable',
      collection_timestamp: new Date().toISOString(),
      // Store data that doesn't have dedicated columns in metadata
      region: geoData.region,
      city: geoData.city,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      language_code: getLanguageCode(),
      time_zone: getTimeZone(),
      screen_resolution: getScreenResolution(),
      viewport_size: getViewportSize(),
      connection_type: getConnectionType(),
    },
  };

  const { error: conversionError } = await supabase
    .from('conversions')
    .insert(conversionData);

  if (conversionError) {
    const msg = `[abTester] Supabase error logging conversion: ${conversionError.message}`;
    console.error(msg);
    return { status: 'ERROR', message: msg };
  } else {
    const msg = `[abTester] Conversion logged successfully for variant ${variantId}, user '${userIdentifierString}' in experiment ${associatedExperimentId}`;
    console.log(msg);
    return { status: 'SUCCESS', message: "Conversion recorded successfully." };
  }
}

function calculateTimeToConvert(userIdentifier: string, experimentId: string): number | null {
  if (typeof localStorage === 'undefined') return null;
  
  const timestampKey = `ab_first_exposure_time_${experimentId}`;
  const exposureKey = `ab_first_exposure_${experimentId}`;
  
  console.log(`[abTester] calculateTimeToConvert: Looking for timestamp key: ${timestampKey}`);
  
  // Check if we have a stored timestamp for first exposure
  const firstExposureTime = localStorage.getItem(timestampKey);
  
  console.log(`[abTester] calculateTimeToConvert: Found timestamp: ${firstExposureTime}`);
  
  if (firstExposureTime) {
    try {
      const exposureTimestamp = parseInt(firstExposureTime);
      const currentTime = Date.now();
      const timeToConvertSeconds = Math.round((currentTime - exposureTimestamp) / 1000);
      
      console.log(`[abTester] calculateTimeToConvert: Exposure timestamp: ${exposureTimestamp}, Current: ${currentTime}, Time to convert: ${timeToConvertSeconds} seconds`);
      
      return timeToConvertSeconds; // Return seconds
    } catch (error) {
      console.warn('[abTester] Error parsing first exposure timestamp:', error);
      return null;
    }
  }
  
  // Simple fallback: if no timestamp exists, this might be immediate conversion
  // Set timestamp now and return 0 (immediate conversion)
  if (!localStorage.getItem(exposureKey)) {
    const now = Date.now();
    localStorage.setItem(exposureKey, 'true');
    localStorage.setItem(timestampKey, now.toString());
    return 0; // Immediate conversion
  }
  
  // FALLBACK: If no first exposure timestamp found, check if we can set one now
  // This handles cases where conversion happens before impression logging
  console.log(`[abTester] calculateTimeToConvert: No timestamp found for experiment ${experimentId}. Checking for fallback options.`);
  
  // Check if this is the user's first time with this experiment
  const hasBeenExposed = localStorage.getItem(exposureKey);
  
  if (!hasBeenExposed) {
    // This is their first exposure, set timestamp now as a fallback
    const currentTimestamp = Date.now();
    localStorage.setItem(exposureKey, 'true');
    localStorage.setItem(timestampKey, currentTimestamp.toString());
    
    console.log(`[abTester] calculateTimeToConvert: Set fallback timestamp for first exposure: ${currentTimestamp}`);
    
    // Return 0 seconds since this is the moment of first exposure
    return 0;
  }
  
  console.log(`[abTester] calculateTimeToConvert: User has been exposed before but no timestamp found. Returning null.`);
  return null;
}

function getReferrerSource(): string | null {
  if (typeof document === 'undefined') return null;
  
  // First try UTM source if available
  const utmParams = getUTMParameters();
  if (utmParams.utm_source) {
    return utmParams.utm_source;
  }
  
  // Fall back to document referrer
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      return referrerUrl.hostname;
    } catch {
      return document.referrer;
    }
  }
  
  return null;
}

// Debug utility function to inspect localStorage AB data
function debugABLocalStorage(): void {
  if (typeof localStorage === 'undefined') {
    console.log('[debugAB] localStorage not available');
    return;
  }
  
  const abKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('ab_') || key.includes('experiment') || key.includes('variant'))) {
      abKeys.push(key);
    }
  }
  
  console.log('[debugAB] A/B Testing localStorage entries:');
  abKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (key.includes('time')) {
      const timestamp = parseInt(value || '0');
      const date = new Date(timestamp);
      console.log(`[debugAB] ${key}: ${value} (${date.toISOString()})`);
    } else {
      console.log(`[debugAB] ${key}: ${value}`);
    }
  });
  
  if (abKeys.length === 0) {
    console.log('[debugAB] No A/B testing data found in localStorage');
  }
}

// Declare global window interface extensions
declare global {
  interface Window {
    trackConversion?: (variantId: string, userIdentifierString: string, conversionType?: string, details?: Record<string, unknown>) => Promise<{ status: 'SUCCESS' | 'DUPLICATE' | 'ERROR' | 'INVALID_INPUT'; message: string }>;
    logClientImpression?: (variant: ABVariant | null, experimentNameFromContext?: string) => Promise<void>;
    getClientSessionIdentifier?: () => string | null;
  }
}

// Assign to window object if in a browser environment
if (typeof window !== 'undefined') {
  console.log('[abTester.ts] Running in browser, assigning functions to window object.');
  window.trackConversion = trackConversion;
  window.logClientImpression = logClientImpression; 
  window.getClientSessionIdentifier = getClientSessionIdentifier;
  (window as unknown as Window & { debugABLocalStorage: typeof debugABLocalStorage }).debugABLocalStorage = debugABLocalStorage;
  console.log('[abTester.ts] window.trackConversion assigned:', !!window.trackConversion);
  console.log('[abTester.ts] window.logClientImpression assigned:', !!window.logClientImpression);
  console.log('[abTester.ts] window.getClientSessionIdentifier assigned:', !!window.getClientSessionIdentifier);
  console.log('[abTester.ts] window.debugABLocalStorage assigned:', !!(window as unknown as Window & { debugABLocalStorage: typeof debugABLocalStorage }).debugABLocalStorage);
}

// Dummy export to ensure this file is treated as a module
export const abTesterInitialized = true; 
