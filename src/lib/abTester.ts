console.log('[abTester.ts] Module loading/starting...');

import { supabase } from './supabaseClient'; // Ensure this path is correct
import { checkUserEligibilityForABTesting } from './userEligibility';

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
  user_profile_id: string | null;
  anonymous_user_id: string | null;
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

function getAnonymousUserId(): string {
  if (typeof localStorage === 'undefined') {
    // Return a transient ID for SSR contexts, ensuring it's unique per request
    return 'anon_ssr_' + crypto.randomUUID();
  }
  let anonId = localStorage.getItem('anonymous_user_id');
  if (!anonId) {
    anonId = crypto.randomUUID();
    localStorage.setItem('anonymous_user_id', anonId);
    console.log('[abTester] New anonymous user ID generated and stored:', anonId);
  }
  return anonId;
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
let hasUserInteracted = false;

// Initialize engagement tracking
if (typeof window !== 'undefined') {
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

export async function logClientImpression(variant: ABVariant | null, experimentNameFromContext?: string): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.log("[abTester] Impression logging skipped: Not in a browser environment.");
    return null;
  }
  if (!variant || variant.id === 'fallback_no_variants') {
    console.log("[abTester] Impression logging skipped: Invalid or fallback variant provided.");
    return null;
  }
  
  if (!variant.experiment_id || variant.experiment_id === 'unknown_experiment_id') {
      console.error(`[abTester] Cannot log impression: Missing valid experiment_id on variant object. Experiment context: "${experimentNameFromContext || 'N/A'}". Variant:`, variant);
      return null;
  }

  const anonymousUserId = getAnonymousUserId();
  const { data: { session } } = await supabase.auth.getSession();
  const userProfileId = session?.user?.id || null;

  // Business Rule #2: Don't log new impressions for users that have already converted.
  if (userProfileId) {
      const eligibility = await checkUserEligibilityForABTesting(userProfileId);
      if (!eligibility.isEligible) {
          console.log(`[abTester] 🚫 IMPRESSION BLOCKED - User ${userProfileId} not eligible for new experiments: ${eligibility.reason}`);
          return null; // Stop impression logging for returning converters.
      }
  }

  // If we reach here, the user is either anonymous or an eligible authenticated user.
  // We can proceed with logging the impression.
  console.log(`[abTester] ✅ IMPRESSION ELIGIBLE - proceeding with impression logging. User Profile ID: ${userProfileId}, Anonymous ID: ${anonymousUserId}`);

  const sessionIdentifier = getClientSessionIdentifier();
  const isFirstExposure = checkIsFirstExposure(variant.experiment_id);
  const utmParams = getUTMParameters();

  const impressionData: ImpressionPayload = {
    variant_id: variant.id,
    experiment_id: variant.experiment_id,
    user_profile_id: userProfileId,
    anonymous_user_id: anonymousUserId,
    session_identifier: sessionIdentifier,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    
    // Geographic & Location (now populated via IP geolocation)
    country_code: null, // Geolocation will be handled server-side if needed
    region: null,  
    city: null,
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
    time_on_page: null, // This is hard to track accurately here now
    scroll_depth_percent: getScrollDepthPercent(),
    bounce: !hasUserInteracted,
    is_first_exposure: isFirstExposure,
    
    // A/B Testing Context
    user_was_eligible: true, // If we got this far, they were eligible at the time of impression
    user_eligibility_status: { reason: 'eligible_at_impression_time' },
    user_context: {
      experiment_name: experimentNameFromContext,
      variant_name: variant.name,
      user_identifier_type: userProfileId ? 'user_profile_id' : 'anonymous_user_id'
    },
    metadata: {
      ...getBrowserMetadata(),
      geolocation_source: 'unavailable',
      collection_timestamp: new Date().toISOString(),
    }
  };

  const { data: insertedImpression, error: impressionError } = await supabase
    .from('impressions')
    .insert(impressionData)
    .select('id')
    .single();

  if (impressionError) {
    console.error('[abTester] Supabase error logging client impression:', impressionError.message, 'Details:', impressionError.details);
    return null;
  } else {
    sessionStorage.setItem(`impression_logged_${variant.experiment_id}`, 'true'); // More specific key
    console.log('[abTester] Client impression logged successfully. Impression ID:', insertedImpression?.id);
    return insertedImpression?.id || null;
  }
}

export async function trackConversion(
  variantId: string, 
  anonymousUserId: string,
  conversionType: string = 'generic_conversion'
): Promise<{ status: 'SUCCESS' | 'DUPLICATE' | 'ERROR' | 'INVALID_INPUT'; message: string }> {
  
  const { data: { session } } = await supabase.auth.getSession();
  // The actual user ID is determined by the session on the server, but we check here for logging.
  const userProfileId = session?.user?.id || null;

  console.log(`[abTester] CONVERSION ATTEMPT: Variant ID: '${variantId}', User Profile ID: '${userProfileId}', Anonymous ID: '${anonymousUserId}', Type: '${conversionType}'`);
  
  if (!anonymousUserId || !variantId) {
    const msg = '[abTester] Anonymous user ID and variant ID are required for conversion tracking.';
    console.error(msg);
    return { status: 'INVALID_INPUT', message: msg };
  }

  // Fetch experiment_id associated with the variantId
  const { data: variantRecord, error: variantError } = await supabase
    .from('variants')
    .select('experiment_id') 
    .eq('id', variantId)
    .single();

  if (variantError || !variantRecord || !variantRecord.experiment_id) {
    const msg = `[abTester] Could not find a valid variant or its experiment_id for variant_id: ${variantId}.`;
    console.error(msg);
    return { status: 'ERROR', message: msg };
  }

  // NOTE: We no longer check for eligibility or duplicates on the client side for conversions.
  // This logic is more reliably handled on the server, which can prevent race conditions
  // and has the final say on user identity.

  // We are also not inserting the conversion directly from the client anymore.
  // We assume the API endpoint that handles the user's form submission will
  // also handle logging the conversion event after successfully creating the user.
  
  console.log('[abTester] Conversion data prepared for server. Server-side logic will handle the final logging and user stitching.');
  
  // This function can now return a success message, assuming the data will be passed
  // to a server-side handler. The actual success of the conversion is determined there.
  return { status: 'SUCCESS', message: 'Conversion initiated. Final processing occurs on the server.' };
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
    trackConversion?: (variantId: string, anonymousUserId: string, conversionType?: string) => Promise<{ status: 'SUCCESS' | 'DUPLICATE' | 'ERROR' | 'INVALID_INPUT'; message: string }>;
    logClientImpression?: (variant: ABVariant | null, experimentNameFromContext?: string) => Promise<string | null>;
    getClientSessionIdentifier?: () => string | null;
    getDeviceType?: () => 'desktop' | 'mobile' | 'tablet' | null;
    debugABLocalStorage?: () => void;
  }
}

// Assign to window object if in a browser environment
if (typeof window !== 'undefined') {
  console.log('[abTester.ts] Running in browser, assigning functions to window object.');
  window.trackConversion = trackConversion;
  window.logClientImpression = logClientImpression; 
  window.getClientSessionIdentifier = getClientSessionIdentifier;
  window.getDeviceType = getDeviceType;
  window.debugABLocalStorage = debugABLocalStorage;
  console.log('[abTester.ts] window.trackConversion assigned:', !!window.trackConversion);
  console.log('[abTester.ts] window.logClientImpression assigned:', !!window.logClientImpression);
  console.log('[abTester.ts] window.getClientSessionIdentifier assigned:', !!window.getClientSessionIdentifier);
  console.log('[abTester.ts] window.getDeviceType assigned:', !!window.getDeviceType);
  console.log('[abTester.ts] window.debugABLocalStorage assigned:', !!window.debugABLocalStorage);
}

// Dummy export to ensure this file is treated as a module
export const abTesterInitialized = true; 
