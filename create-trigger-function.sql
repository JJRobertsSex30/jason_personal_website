-- ========================================
-- USER EXPERIMENT PARTICIPATION TRIGGER
-- Execute this in Supabase SQL Console
-- ========================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION track_user_experiment_participation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user participation record
  INSERT INTO user_experiment_participation (
    user_identifier,
    experiment_id,
    variant_id,
    first_exposure_date,
    was_eligible_at_exposure,
    eligibility_criteria,
    total_impressions,
    has_converted,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_identifier,
    NEW.experiment_id,
    NEW.variant_id,
    NEW.impression_at,  -- Use impression_at as first_exposure_date
    COALESCE(NEW.user_was_eligible, true),  -- Default to true if null
    COALESCE(NEW.user_eligibility_status, '{}'::jsonb),  -- Use eligibility status from impression
    1,  -- First impression
    false,  -- Has not converted yet
    NOW(),
    NOW()
  )
  ON CONFLICT (user_identifier, experiment_id)
  DO UPDATE SET
    total_impressions = user_experiment_participation.total_impressions + 1,
    updated_at = NOW()
    -- Note: Don't update first_exposure_date, was_eligible_at_exposure, or variant_id
    -- These should remain from the first exposure
  ;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_track_user_participation ON impressions;
CREATE TRIGGER trigger_track_user_participation
  AFTER INSERT ON impressions
  FOR EACH ROW
  EXECUTE FUNCTION track_user_experiment_participation();

-- Add comments for documentation
COMMENT ON FUNCTION track_user_experiment_participation() IS 'Automatically tracks user participation in A/B test experiments when impressions are logged';

-- ========================================
-- TRIGGER FUNCTION COMPLETE
-- This will now properly handle impression inserts without column errors
-- ======================================== 