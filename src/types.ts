export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  website?: string;
  email?: string;
  created_at?: string | null;
  updated_at?: string | null;
  kit_state: 'active' | 'inactive' | 'unconfirmed' | 'cancelled' | 'complained' | 'bounced' | 'cold' | 'blocked' | null;
  insight_gems?: number;
  [key: string]: unknown;
}

// Interfaces for A/B Testing
export interface VariantConfig {
  [key: string]: unknown;
}

export interface Variant {
  id: string;
  experiment_id: string;
  name: string;
  description?: string | null;
  config_json?: VariantConfig | null;
  created_at: string;
  updated_at: string;
  impressions_count?: number;
  conversions_count?: number;
  conversion_rate?: number;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants?: Variant[];
  managingVariants?: boolean;
  variantsJsonString?: string;
}

export interface GemTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
}

export interface UserEngagement {
  id: string;
  user_id: string;
  engagement_type: string;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
}

export interface KitSubscriber {
  id: number;
  first_name: string | null;
  email_address: string;
  state: 'active' | 'inactive' | 'unconfirmed' | 'cancelled' | 'complained' | 'bounced' | 'cold' | 'blocked';
  created_at: string | null;
  fields: Record<string, unknown>;
}

export interface KitTag {
  id: number;
  name: string;
  tagged_at: string; // V4 uses tagged_at instead of created_at
}

export interface MetaData {
    title?: string;
    description?: string;
    // Add other meta properties as needed
} 