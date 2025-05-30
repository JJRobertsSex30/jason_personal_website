console.log('[abTester.ts] Module loading/starting...'); // VERY TOP LEVEL LOG

import { supabase } from './supabaseClient'; // Import your Supabase client

// Updated interface to reflect variant structure from DB
// and how we expect to use its config_json
export interface ABVariant {
  id: string; // Actual UUID of the variant from Supabase
  name: string; // e.g., 'A', 'B', 'control' - corresponds to variants.name
  experiment_id: string; // UUID of the parent experiment
  headline: string; // Expected to be in config_json
  subheadline: string; // Expected to be in config_json
  // raw_config_json for other potential testable elements
  raw_config_json?: Record<string, unknown> | null; 
}

// Type for Supabase impression insert payload
interface ImpressionPayload {
  variant_id: string;
  user_identifier: string;
  experiment_id: string;
  session_identifier?: string | null;
}

// Type for Supabase conversion insert payload
interface ConversionPayload {
  variant_id: string;
  experiment_id: string;
  user_identifier: string;
  conversion_type: string;
  details?: Record<string, unknown> | null;
  session_identifier?: string | null;
}

// Helper to safely get properties from config_json or provide defaults
function parseVariantConfig(config: Record<string, unknown> | null | undefined, variantName: string): { headline: string, subheadline: string } {
  const defaults = {
    headline: `Default Headline for ${variantName}`,
    subheadline: `Default subheadline for ${variantName}. Configure in DB.`
  };
  if (!config) return defaults;
  return {
    headline: typeof config.headline === 'string' ? config.headline : defaults.headline,
    subheadline: typeof config.subheadline === 'string' ? config.subheadline : defaults.subheadline,
  };
}

async function fetchExperimentVariants(experimentName: string): Promise<ABVariant[]> {
  console.log(`A/B Test: Fetching variants for experiment: ${experimentName}`);
  const { data: expData, error: expError } = await supabase
    .from('experiments')
    .select('id, name')
    .eq('name', experimentName)
    .eq('is_active', true) // Only fetch for active experiments
    .maybeSingle(); // Use maybeSingle() instead of single()

  if (expError) { // Check for explicit DB errors first
    console.error(`A/B Test: Database error fetching experiment named "${experimentName}". Error:`, expError.message);
    return [];
  }

  if (!expData) { // Now check if expData is null (no active experiment found)
    console.error(`A/B Test: Could not find an active experiment named "${experimentName}".`);
    return [];
  }

  const experimentId = expData.id;

  const { data: variantsData, error: variantsError } = await supabase
    .from('variants')
    .select('id, name, experiment_id, description, config_json') // Fetch config_json
    .eq('experiment_id', experimentId);

  if (variantsError) {
    console.error(`A/B Test: Error fetching variants for experiment ID "${experimentId}":`, variantsError.message);
    return [];
  }

  if (!variantsData || variantsData.length === 0) {
    console.warn(`A/B Test: No variants found for experiment "${experimentName}" (ID: ${experimentId}).`);
    return [];
  }
  
  // Map Supabase variant data to our ABVariant interface
  return variantsData.map(v => {
    const config = parseVariantConfig(v.config_json as Record<string, unknown> | null, v.name);
    return {
      id: v.id,
      name: v.name,
      experiment_id: v.experiment_id,
      headline: config.headline,
      subheadline: config.subheadline,
      raw_config_json: v.config_json as Record<string, unknown> | null,
    };
  });
}

// This function should now primarily run on the client for consistent ID generation.
function getClientUserIdentifier(): string {
  if (typeof localStorage === 'undefined') {
    // This case should ideally be avoided for client-specific ID generation.
    console.warn("Client user identifier requested in non-browser environment.");
    return 'client_anon_' + crypto.randomUUID(); 
  }
  let userId = localStorage.getItem('ab_user_identifier');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('ab_user_identifier', userId);
  }
  return userId;
}

function getClientSessionIdentifier(): string | null {
  if (typeof sessionStorage === 'undefined') {
    console.warn("Client session identifier requested in non-browser environment.");
    return null;
  }
  let sessionId = sessionStorage.getItem('ab_session_identifier');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('ab_session_identifier', sessionId);
  }
  return sessionId;
}

// Determines variant (can be called SSR or client-side for re-evaluation if needed)
// Does NOT log impression itself anymore.
export async function getVariant(experimentName: string): Promise<ABVariant> {
  const activeVariants = await fetchExperimentVariants(experimentName);

  if (!activeVariants || activeVariants.length === 0) {
    console.error(`A/B Test: No active variants for experiment '${experimentName}'. Cannot proceed.`);
    return { 
      id: 'fallback_no_variants', name: 'Fallback', experiment_id: 'unknown',
      headline: 'Error: Experiment Not Found', 
      subheadline: 'Please check A/B test configuration.', raw_config_json: {}
    };
  }

  let chosenVariant: ABVariant | undefined;
  // Variant selection logic (localStorage first, then random)
  // This part primarily makes sense on the client, but can run on server with no localStorage effect.
  if (typeof localStorage !== 'undefined') {
    const localStorageKey = `ab_variant_${experimentName}`;
    const storedVariantId = localStorage.getItem(localStorageKey);
    if (storedVariantId) {
      chosenVariant = activeVariants.find(v => v.id === storedVariantId);
      if (!chosenVariant) {
        localStorage.removeItem(localStorageKey); // Clean up invalid/outdated stored variant
      }
    }
    if (!chosenVariant) {
      const randomIndex = Math.floor(Math.random() * activeVariants.length);
      chosenVariant = activeVariants[randomIndex];
      localStorage.setItem(localStorageKey, chosenVariant.id);
    }
  } else {
    // SSR: Just pick randomly, no localStorage stickiness applied here.
    const randomIndex = Math.floor(Math.random() * activeVariants.length);
    chosenVariant = activeVariants[randomIndex];
  }
  
  if (!chosenVariant) { // Should be extremely rare if activeVariants is populated
    chosenVariant = activeVariants[0];
  }
  return chosenVariant;
}

// NEW: Client-side only impression logger
export async function logClientImpression(variant: ABVariant | null, experimentName: string) {
  if (typeof window === 'undefined' || !variant || variant.id === 'fallback_no_variants') {
    // console.log("Impression logging skipped (not client-side or invalid variant).");
    return; // Only run on client and if variant is valid
  }

  const userIdentifier = getClientUserIdentifier();
  const sessionIdentifier = getClientSessionIdentifier();
  const impressionKey = `impression_logged_${experimentName}_${variant.id}_${sessionIdentifier || 'no_session'}`;

  // Prevent logging multiple impressions for the same variant in the same session
  if (sessionStorage.getItem(impressionKey)) {
    // console.log(`Impression for ${variant.name} in session ${sessionIdentifier} already logged.`);
    return;
  }

  console.log(`A/B Test CLIENT IMPRESSION: Experiment '${experimentName}', Variant ID: '${variant.id}', Name: '${variant.name}', User: '${userIdentifier}', Session: '${sessionIdentifier}'`);
  
  const impressionData: ImpressionPayload = {
    variant_id: variant.id,
    user_identifier: userIdentifier,
    experiment_id: variant.experiment_id,
  };
  if (sessionIdentifier) {
    impressionData.session_identifier = sessionIdentifier;
  }

  const { error: impressionError } = await supabase
    .from('impressions')
    .insert(impressionData);

  if (impressionError) {
    console.error('Supabase error logging client impression:', impressionError.message);
  } else {
    sessionStorage.setItem(impressionKey, 'true'); // Mark as logged for this session
  }
}

export async function trackConversion(
  experimentName: string, 
  variantId: string, 
  details?: Record<string, unknown>
) {
  const userIdentifier = getClientUserIdentifier();
  const sessionIdentifier = getClientSessionIdentifier();
  
  console.log(`A/B Test CLIENT CONVERSION: Experiment '${experimentName}', Variant ID: '${variantId}', User: '${userIdentifier}', Session: '${sessionIdentifier}', Details:`, details);
  
  const { data: variantData, error: variantError } = await supabase
    .from('variants')
    .select('experiment_id')
    .eq('id', variantId)
    .single();

  if (variantError || !variantData || !variantData.experiment_id) {
    console.error(`Supabase: Could not find valid experiment_id for variant_id: ${variantId}. Conversion not logged. Error:`, variantError?.message);
    return;
  }
  const associatedExperimentId: string = variantData.experiment_id;

  const conversionData: ConversionPayload = {
    variant_id: variantId, 
    experiment_id: associatedExperimentId,
    user_identifier: userIdentifier,
    conversion_type: typeof details?.type === 'string' ? details.type : 'form_submission',
    details: details,
  };
  if (sessionIdentifier) {
    conversionData.session_identifier = sessionIdentifier;
  }

  const { error: conversionError } = await supabase
    .from('conversions')
    .insert(conversionData);

  if (conversionError) {
    console.error('Supabase error logging conversion:', conversionError.message);
  } else {
    console.log(`Supabase: Conversion logged successfully for variant ${variantId} in experiment ${associatedExperimentId}`);
  }
}

declare global {
  interface Window {
    trackConversion?: (experimentName: string, variantId: string, details?: Record<string, unknown>) => Promise<void>;
    logClientImpression?: (variant: ABVariant | null, experimentName: string) => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  console.log('[abTester.ts] Running in browser, attempting to set window functions.'); // DEBUG LOG
  window.trackConversion = trackConversion;
  window.logClientImpression = logClientImpression; 
  console.log('[abTester.ts] window.trackConversion assigned:', typeof window.trackConversion);
  console.log('[abTester.ts] window.logClientImpression assigned:', typeof window.logClientImpression);
}

export const abTesterInitialized = true; // Dummy export 