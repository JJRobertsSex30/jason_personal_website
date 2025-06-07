export interface UserProfile {
  id: string;
  email: string;
  first_name?: string | null;
  is_email_verified: boolean;
  email_verified_at?: string | null;
  kit_subscriber_id?: string | null;
  insight_gems: number;
  referral_code?: string | null;
  created_at: string;
  updated_at: string;
  gem_transactions?: GemTransaction[];
  user_engagements?: UserEngagement[];
  [key: string]: unknown;
}

export interface GemTransaction {
  id: string;
  user_id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  description: string;
  related_engagement_id?: string | null;
  created_at: string;
}

export interface UserEngagement {
  id: string;
  user_id: string;
  engagement_type: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
} export interface UserProfile {
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