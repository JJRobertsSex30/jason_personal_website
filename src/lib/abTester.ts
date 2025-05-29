export interface HeroVariant {
  id: string;
  headline: string;
  subheadline: string;
}

export const heroVariants: HeroVariant[] = [
  { id: 'A', headline: 'Original Headline From AB Tester', subheadline: 'Original Subheadline from AB Tester - Variant A' },
  { id: 'B', headline: 'New Awesome Headline From AB Tester', subheadline: 'New Awesome Subheadline from AB Tester - Variant B' },
  { id: 'C', headline: 'Another Test Headline From AB Tester', subheadline: 'Another Test Subheadline from AB Tester - Variant C' },
];

// TODO: Implement stickiness (e.g., using cookies or user ID)
// TODO: Integrate with Supabase to fetch variants
export function getVariant(experimentName: string, variants: HeroVariant[]): HeroVariant {
  // Super simple random assignment for now
  const randomIndex = Math.floor(Math.random() * variants.length);
  const chosenVariant = variants[randomIndex];
  
  // Log impression (variant shown) - for now, to console
  // TODO: Replace with Supabase logging
  console.log(`IMPRESSION: Experiment '${experimentName}', Variant ID: '${chosenVariant.id}', Headline: '${chosenVariant.headline}'`);
  
  return chosenVariant;
}

// TODO: Integrate with Supabase to log conversions
export function trackConversion(experimentName: string, variantId: string, details?: Record<string, unknown>) {
  // Log conversion - for now, to console
  // TODO: Replace with Supabase logging
  console.log(`CONVERSION: Experiment '${experimentName}', Variant ID: '${variantId}', Details:`, details);
}

// Extend the Window interface to include our custom function
declare global {
  interface Window {
    trackConversion?: (experimentName: string, variantId: string, details?: Record<string, unknown>) => void;
  }
}

// Expose to client-side scripts if not using a bundler that handles this
if (typeof window !== 'undefined') {
  window.trackConversion = trackConversion;
} 