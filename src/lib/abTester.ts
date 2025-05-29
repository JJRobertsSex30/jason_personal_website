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

// Simplified: always uses localStorage or generates a new UUID if not in browser.
function generateUserIdentifier(): string {
  if (typeof localStorage !== 'undefined') {
    let userId = localStorage.getItem('ab_user_identifier');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('ab_user_identifier', userId);
    }
    return userId;
  }
  // Fallback for non-browser environments (e.g., during SSR if getVariant is called server-side without localStorage access)
  return 'server_anon_' + crypto.randomUUID(); 
}

export async function getVariant(experimentName: string): Promise<ABVariant> {
  const userIdentifier = generateUserIdentifier();
  const localStorageKey = `ab_variant_${experimentName}`; // e.g., ab_variant_heroHeadlineTest
  let chosenVariant: ABVariant | undefined;

  // Fetch variants dynamically for the given experiment name
  const activeVariants = await fetchExperimentVariants(experimentName);

  if (!activeVariants || activeVariants.length === 0) {
    console.error(`A/B Test: No active variants for experiment '${experimentName}'. Cannot proceed.`);
    // Return a hardcoded fallback variant to prevent site breakage
    return { 
      id: 'fallback_no_variants', 
      name: 'Fallback', 
      experiment_id: 'unknown',
      headline: 'Error: Experiment Not Found', 
      subheadline: 'Please check A/B test configuration.',
      raw_config_json: {}
    };
  }

  if (typeof localStorage !== 'undefined') {
    const storedVariantId = localStorage.getItem(localStorageKey);
    if (storedVariantId) {
      chosenVariant = activeVariants.find(v => v.id === storedVariantId);
      if (chosenVariant) {
        console.log(`A/B Test: User '${userIdentifier}' already assigned to variant '${chosenVariant.name}' (ID: ${chosenVariant.id}) for experiment '${experimentName}' from localStorage.`);
      } else {
        // Stored variant ID no longer exists or is invalid for the current set of active variants
        localStorage.removeItem(localStorageKey); // Clear invalid stored ID
        console.warn(`A/B Test: Stored variant ID '${storedVariantId}' for experiment '${experimentName}' is invalid or no longer active. Will assign a new one.`);
      }
    }
  }

  if (!chosenVariant) {
    const randomIndex = Math.floor(Math.random() * activeVariants.length);
    chosenVariant = activeVariants[randomIndex];

    if (typeof localStorage !== 'undefined' && chosenVariant) {
      localStorage.setItem(localStorageKey, chosenVariant.id);
      console.log(`A/B Test: User '${userIdentifier}' newly assigned to variant '${chosenVariant.name}' (ID: ${chosenVariant.id}) for experiment '${experimentName}'. Stored in localStorage.`);
    }
  }
  
  // This should theoretically not be hit if activeVariants has items, but as a safeguard:
  if (!chosenVariant) {
    console.warn(`A/B Test: Could not determine variant for experiment '${experimentName}' after fetch and random assignment. Using first available as default.`);
    chosenVariant = activeVariants[0]; 
  }

  // Log impression
  if (chosenVariant && chosenVariant.id !== 'fallback_no_variants') {
    console.log(`A/B Test IMPRESSION: Experiment '${experimentName}', Variant ID: '${chosenVariant.id}', Name: '${chosenVariant.name}', User: '${userIdentifier}'`);
    const { error: impressionError } = await supabase
      .from('impressions')
      .insert({
        variant_id: chosenVariant.id, // This is the actual UUID from the DB
        user_identifier: userIdentifier,
        experiment_id: chosenVariant.experiment_id // Log experiment_id with impression
      });

    if (impressionError) {
      console.error('Supabase error logging impression:', impressionError.message);
    }
  } else {
     console.error("A/B Test: chosenVariant is undefined or fallback, cannot log impression.");
  }
  
  return chosenVariant;
}

export async function trackConversion(
  experimentName: string, // e.g. "heroHeadlineTest"
  variantId: string,      // The actual UUID of the variant from the DB
  details?: Record<string, unknown>
) {
  const userIdentifier = generateUserIdentifier();
  console.log(`A/B Test CONVERSION: Experiment '${experimentName}', Variant ID: '${variantId}', User: '${userIdentifier}', Details:`, details);
  
  // We need experiment_id to log conversion. The variantId should belong to an experiment.
  // We can fetch the experiment_id using the variantId if not passed directly.
  let associatedExperimentId: string | null = null;

  const { data: variantData, error: variantError } = await supabase
    .from('variants')
    .select('experiment_id')
    .eq('id', variantId)
    .single();

  if (variantError || !variantData) {
    console.error(`Supabase: Could not find experiment_id for variant_id: ${variantId}. Conversion not logged. Error:`, variantError?.message);
    return;
  }
  associatedExperimentId = variantData.experiment_id;

  const { error: conversionError } = await supabase
    .from('conversions')
    .insert({
      variant_id: variantId, 
      experiment_id: associatedExperimentId, 
      user_identifier: userIdentifier,
      conversion_type: typeof details?.type === 'string' ? details.type : 'form_submission', // Default to form_submission
      details: details, 
    });

  if (conversionError) {
    console.error('Supabase error logging conversion:', conversionError.message);
  } else {
    console.log(`Supabase: Conversion logged successfully for variant ${variantId} in experiment ${associatedExperimentId}`);
  }
}

// Extend the Window interface
declare global {
  interface Window {
    // trackConversion remains async due to Supabase calls within it
    trackConversion?: (experimentName: string, variantId: string, details?: Record<string, unknown>) => Promise<void>; 
  }
}

// Expose to client-side scripts
if (typeof window !== 'undefined') {
  window.trackConversion = trackConversion;
} 