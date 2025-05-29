import { supabase } from './supabaseClient'; // Import your Supabase client

export interface HeroVariant {
  id: string; // This will now correspond to the UUID of the variant in Supabase
  name: string; // e.g., 'A', 'B', 'control' - corresponds to variants.name
  headline: string;
  subheadline: string;
  // experiment_id could also be stored here if variants are fetched dynamically
}

// This will eventually be replaced by fetching from Supabase
export const heroVariants: HeroVariant[] = [
  { id: 'variant_uuid_A', name: 'A', headline: 'Original Headline From AB Tester', subheadline: 'Original Subheadline from AB Tester - Variant A' },
  { id: 'variant_uuid_B', name: 'B', headline: 'New Awesome Headline From AB Tester', subheadline: 'New Awesome Subheadline from AB Tester - Variant B' },
  { id: 'variant_uuid_C', name: 'C', headline: 'Another Test Headline From AB Tester', subheadline: 'Another Test Subheadline from AB Tester - Variant C' },
];

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

export async function getVariant(experimentName: string, clientVariants: HeroVariant[]): Promise<HeroVariant> {
  const userIdentifier = generateUserIdentifier(); // Synchronous again
  const localStorageKey = `ab_variant_${experimentName}`;
  let chosenVariant: HeroVariant | undefined;

  if (typeof localStorage !== 'undefined') {
    const storedVariantId = localStorage.getItem(localStorageKey);
    if (storedVariantId) {
      chosenVariant = clientVariants.find(v => v.id === storedVariantId);
    }
  }

  if (!chosenVariant) {
    const randomIndex = Math.floor(Math.random() * clientVariants.length);
    chosenVariant = clientVariants[randomIndex];

    if (typeof localStorage !== 'undefined' && chosenVariant) {
      localStorage.setItem(localStorageKey, chosenVariant.id);
    }
  }

  if (!chosenVariant) {
    console.warn(`A/B Test: Could not determine variant for experiment '${experimentName}'. Using first as default.`);
    chosenVariant = clientVariants[0];
  }

  if (chosenVariant) {
    console.log(`A/B Test IMPRESSION: Experiment '${experimentName}', Variant ID: '${chosenVariant.id}', Name: '${chosenVariant.name}', User: '${userIdentifier}'`);
    const { error: impressionError } = await supabase
      .from('impressions')
      .insert({
        variant_id: chosenVariant.id, 
        user_identifier: userIdentifier,
      });

    if (impressionError) {
      console.error('Supabase error logging impression:', impressionError);
    }
  } else {
    console.error("A/B Test: chosenVariant is undefined, cannot log impression.");
    chosenVariant = clientVariants[0] || {id: 'fallback_id', name: 'fallback', headline: 'Fallback', subheadline: 'Fallback'};
  }
  
  return chosenVariant;
}

export async function trackConversion(experimentName: string, variantId: string, details?: Record<string, unknown>) {
  const userIdentifier = generateUserIdentifier(); // Synchronous again
  console.log(`A/B Test CONVERSION: Experiment '${experimentName}', Variant ID: '${variantId}', User: '${userIdentifier}', Details:`, details);
  
  let currentExperimentId: string | null = null;
  const expResult = await supabase.from('experiments').select('id').eq('name', experimentName).single();
  if (expResult.data?.id) {
    currentExperimentId = expResult.data.id;
  } else {
    console.error(`Supabase: Could not find experiment_id for experiment name: ${experimentName}. Conversion not logged.`);
    if(expResult.error) console.error('Supabase error fetching experiment:', expResult.error);
    return; 
  }

  const { error: conversionError } = await supabase
    .from('conversions')
    .insert({
      variant_id: variantId, 
      experiment_id: currentExperimentId, 
      user_identifier: userIdentifier,
      conversion_type: typeof details?.type === 'string' ? details.type : 'unknown',
      details: details, 
    });

  if (conversionError) {
    console.error('Supabase error logging conversion:', conversionError);
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