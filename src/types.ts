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
} 