console.log('[abTester.ts] Module loading/starting...');

import { supabase } from './supabaseClient'; // Ensure this path is correct

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
  
  // Short-term deduplication (2 minutes) to prevent rapid refresh spam only
  const shortTermKey = `impression_recent_${variant.experiment_id}_${variant.id}_${Math.floor(Date.now() / 120000)}`; // 2-minute windows
  
  if (sessionStorage.getItem(shortTermKey)) {
    console.log(`[abTester] Impression for variant "${variant.name}" (ID: ${variant.id}) already logged in the last 2 minutes. Skipping to prevent spam.`);
    return;
  }

  console.log(`[abTester] Logging CLIENT IMPRESSION: Experiment ID: '${variant.experiment_id}', Variant ID: '${variant.id}', Name: '${variant.name}', User: '${userIdentifier}', Session: '${sessionIdentifier || 'N/A'}'`);
  
  const impressionData: ImpressionPayload = {
    variant_id: variant.id,
    user_identifier: userIdentifier,
    experiment_id: variant.experiment_id, 
    session_identifier: sessionIdentifier,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
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
    console.log('[abTester] Client impression logged successfully to Supabase.');
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

  const conversionData: ConversionPayload = {
    variant_id: variantId, 
    experiment_id: associatedExperimentId,
    user_identifier: userIdentifierString,
    conversion_type: conversionType,
    details: details,
    session_identifier: sessionIdentifier,
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
  console.log('[abTester.ts] window.trackConversion assigned:', !!window.trackConversion);
  console.log('[abTester.ts] window.logClientImpression assigned:', !!window.logClientImpression);
  console.log('[abTester.ts] window.getClientSessionIdentifier assigned:', !!window.getClientSessionIdentifier);
}

// Dummy export to ensure this file is treated as a module
export const abTesterInitialized = true; 
