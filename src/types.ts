export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  website?: string;
  email?: string; // Added email as it's used in UserProfileManager
  created_at?: string | null; // Added based on UserProfileManager usage
  updated_at?: string | null; // Added based on UserProfileManager usage
  kit_state?: string;
  [key: string]: unknown; 
}

// Interfaces for A/B Testing
export interface VariantConfig {
  [key: string]: unknown; // Can be more specific later
}

export interface Variant {
  id: string; // UUID
  experiment_id: string; // UUID
  name: string;
  description?: string | null;
  config_json?: VariantConfig | null;
  created_at: string; // Timestamptz
  updated_at: string; // Timestamptz
  impressions_count?: number;
  conversions_count?: number;
  conversion_rate?: number; 
}

export interface Experiment {
  id: string; // UUID
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string; // Timestamptz
  updated_at: string; // Timestamptz
  variants?: Variant[];
  // UI helper, not from DB
  managingVariants?: boolean; 
  variantsJsonString?: string; // New property for pre-stringified variant data for charts
} 