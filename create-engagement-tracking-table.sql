-- ========================================
-- USER ENGAGEMENT TRACKING TABLE MIGRATION
-- Execute this entire script in Supabase SQL Console
-- ========================================
-- Create user_engagement_tracking table for tracking return users separately from A/B testing
-- This ensures clean A/B test data while still capturing valuable UX insights

CREATE TABLE IF NOT EXISTS user_engagement_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL,
  engagement_type text NOT NULL, -- 'page_view', 'quiz_start', 'quiz_complete', 'repeat_conversion'
  experiment_context text, -- Name of experiment they would have been in
  variant_context text, -- Name of variant they would have seen
  page_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement_tracking(user_identifier);
CREATE INDEX IF NOT EXISTS idx_user_engagement_type ON user_engagement_tracking(engagement_type);
CREATE INDEX IF NOT EXISTS idx_user_engagement_context ON user_engagement_tracking(experiment_context);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON user_engagement_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_user_engagement_metadata ON user_engagement_tracking USING GIN(metadata);

-- Add comment for documentation
COMMENT ON TABLE user_engagement_tracking IS 'Tracks engagement for users ineligible for A/B testing (already converted) to maintain UX insights without contaminating experiment data';
COMMENT ON COLUMN user_engagement_tracking.engagement_type IS 'Type of engagement: page_view, quiz_start, quiz_complete, repeat_conversion';
COMMENT ON COLUMN user_engagement_tracking.experiment_context IS 'Which experiment they would have participated in if eligible';
COMMENT ON COLUMN user_engagement_tracking.variant_context IS 'Which variant they would have seen if eligible';
COMMENT ON COLUMN user_engagement_tracking.metadata IS 'Additional tracking data including user_status, tracking_purpose, excluded_from_ab_testing flag';

-- ========================================
-- MIGRATION COMPLETE
-- The user_engagement_tracking table is now ready for use
-- ======================================== 