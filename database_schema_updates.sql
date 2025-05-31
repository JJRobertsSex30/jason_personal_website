-- =================================================================
-- A/B Testing User-Level Conversion Tracking Schema Updates
-- =================================================================
-- Updated to match existing database schema from database-schema.md

-- 1. Update impressions table for eligibility tracking
-- -----------------------------------------------------------------

-- Add user-level tracking columns to existing impressions table
ALTER TABLE impressions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_first_exposure BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS user_eligibility_status JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_context JSONB DEFAULT '{}';

-- Update existing records to include eligibility indicators
UPDATE impressions 
SET user_eligibility_status = COALESCE(metadata, '{}') || jsonb_build_object(
  'was_already_subscribed', false,
  'user_subscription_status', 'unknown',
  'has_converted_previously', false,
  'user_session_count', 1,
  'eligibility_checked_at', NOW()
)
WHERE user_eligibility_status = '{}';

-- 2. Update conversions table for proper attribution
-- -----------------------------------------------------------------

-- Add user-level attribution columns to existing conversions table
ALTER TABLE conversions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_first_conversion_for_experiment BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS conversion_attribution_source TEXT DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS conversion_window_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS original_exposure_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversion_eligibility_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conversion_context JSONB DEFAULT '{}';

-- Ensure user_identifier is properly set (it should already exist based on schema)
UPDATE conversions 
SET user_identifier = COALESCE(NULLIF(user_identifier, ''), session_identifier, 'anonymous_' || id::text)
WHERE user_identifier IS NULL OR user_identifier = '';

-- 3. Create new tables for enhanced tracking
-- -----------------------------------------------------------------

-- User experiment participation tracking
CREATE TABLE IF NOT EXISTS user_experiment_participation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier TEXT NOT NULL,
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    first_exposure_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    was_eligible_at_exposure BOOLEAN NOT NULL DEFAULT TRUE,
    eligibility_criteria JSONB DEFAULT '{}',
    total_impressions INTEGER DEFAULT 1,
    has_converted BOOLEAN DEFAULT FALSE,
    first_conversion_date TIMESTAMPTZ,
    conversion_within_window BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_identifier, experiment_id),
    CHECK(first_conversion_date IS NULL OR first_conversion_date >= first_exposure_date)
);

-- Conversion attribution tracking
CREATE TABLE IF NOT EXISTS conversion_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id UUID NOT NULL REFERENCES conversions(id) ON DELETE CASCADE,
    user_identifier TEXT NOT NULL,
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    attribution_method TEXT NOT NULL DEFAULT 'first_exposure',
    attribution_confidence DECIMAL(3,2) DEFAULT 1.00,
    time_to_conversion_hours INTEGER,
    conversion_value_attributed DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(conversion_id),
    CHECK(attribution_confidence >= 0 AND attribution_confidence <= 1),
    CHECK(time_to_conversion_hours >= 0)
);

-- 4. Create indexes for performance
-- -----------------------------------------------------------------

-- Impressions table indexes
CREATE INDEX IF NOT EXISTS idx_impressions_user_identifier ON impressions(user_identifier);
CREATE INDEX IF NOT EXISTS idx_impressions_user_variant ON impressions(user_identifier, variant_id);
CREATE INDEX IF NOT EXISTS idx_impressions_first_exposure ON impressions(user_identifier, variant_id, impression_at) 
WHERE is_first_exposure = TRUE;
CREATE INDEX IF NOT EXISTS idx_impressions_eligibility ON impressions USING GIN(user_eligibility_status);
CREATE INDEX IF NOT EXISTS idx_impressions_metadata ON impressions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_impressions_date ON impressions(impression_at);

-- Conversions table indexes
CREATE INDEX IF NOT EXISTS idx_conversions_user_identifier ON conversions(user_identifier);
CREATE INDEX IF NOT EXISTS idx_conversions_user_variant ON conversions(user_identifier, variant_id);
CREATE INDEX IF NOT EXISTS idx_conversions_first_conversion ON conversions(user_identifier, variant_id, created_at) 
WHERE is_first_conversion_for_experiment = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversions_attribution ON conversions(conversion_attribution_source, created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_metadata ON conversions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_conversions_date ON conversions(created_at);

-- User experiment participation indexes
CREATE INDEX IF NOT EXISTS idx_user_exp_participation_user ON user_experiment_participation(user_identifier);
CREATE INDEX IF NOT EXISTS idx_user_exp_participation_exp ON user_experiment_participation(experiment_id);
CREATE INDEX IF NOT EXISTS idx_user_exp_participation_variant ON user_experiment_participation(variant_id);
CREATE INDEX IF NOT EXISTS idx_user_exp_participation_eligible ON user_experiment_participation(experiment_id, was_eligible_at_exposure);
CREATE INDEX IF NOT EXISTS idx_user_exp_participation_converted ON user_experiment_participation(experiment_id, has_converted, was_eligible_at_exposure);
CREATE INDEX IF NOT EXISTS idx_user_exp_participation_dates ON user_experiment_participation(first_exposure_date, first_conversion_date);

-- Conversion attribution indexes
CREATE INDEX IF NOT EXISTS idx_conversion_attribution_exp ON conversion_attribution(experiment_id);
CREATE INDEX IF NOT EXISTS idx_conversion_attribution_user ON conversion_attribution(user_identifier);
CREATE INDEX IF NOT EXISTS idx_conversion_attribution_method ON conversion_attribution(attribution_method);
CREATE INDEX IF NOT EXISTS idx_conversion_attribution_time ON conversion_attribution(time_to_conversion_hours);

-- 5. Create views for easy querying
-- -----------------------------------------------------------------

-- View for user-level experiment metrics
CREATE OR REPLACE VIEW user_level_experiment_metrics AS
SELECT 
    e.id as experiment_id,
    e.name as experiment_name,
    v.id as variant_id,
    v.name as variant_name,
    COUNT(DISTINCT uep.user_identifier) as total_users,
    COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END) as eligible_users,
    COUNT(DISTINCT CASE WHEN uep.has_converted AND uep.was_eligible_at_exposure THEN uep.user_identifier END) as converted_users,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END) > 0 
            THEN (COUNT(DISTINCT CASE WHEN uep.has_converted AND uep.was_eligible_at_exposure THEN uep.user_identifier END)::decimal / 
                  COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END)) * 100 
            ELSE 0 
        END, 2
    ) as conversion_rate,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT uep.user_identifier) > 0 
            THEN (COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END)::decimal / 
                  COUNT(DISTINCT uep.user_identifier)) * 100 
            ELSE 0 
        END, 2
    ) as eligibility_rate,
    AVG(uep.total_impressions) as avg_impressions_per_user,
    AVG(EXTRACT(EPOCH FROM (uep.first_conversion_date - uep.first_exposure_date))/3600) as avg_hours_to_conversion
FROM experiments e
JOIN variants v ON v.experiment_id = e.id
LEFT JOIN user_experiment_participation uep ON uep.variant_id = v.id
GROUP BY e.id, e.name, v.id, v.name;

-- View for experiment quality metrics
CREATE OR REPLACE VIEW experiment_quality_metrics AS
SELECT 
    e.id as experiment_id,
    e.name as experiment_name,
    e.is_active,
    COUNT(DISTINCT v.id) as variant_count,
    COUNT(DISTINCT uep.user_identifier) as total_users,
    COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END) as eligible_users,
    COUNT(DISTINCT CASE WHEN uep.has_converted THEN uep.user_identifier END) as converted_users,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT uep.user_identifier) > 0 
            THEN (COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END)::decimal / 
                  COUNT(DISTINCT uep.user_identifier)) * 100 
            ELSE 0 
        END, 2
    ) as overall_eligibility_rate,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END) >= 100 * COUNT(DISTINCT v.id) 
        THEN TRUE 
        ELSE FALSE 
    END as has_adequate_sample_size,
    DATE_PART('day', NOW() - e.created_at) as experiment_duration_days
FROM experiments e
JOIN variants v ON v.experiment_id = e.id
LEFT JOIN user_experiment_participation uep ON uep.experiment_id = e.id
GROUP BY e.id, e.name, e.is_active, e.created_at;

-- 6. Create functions for data integrity
-- -----------------------------------------------------------------

-- Function to update user participation when impression is recorded
CREATE OR REPLACE FUNCTION update_user_experiment_participation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if user_identifier is provided
    IF NEW.user_identifier IS NULL OR NEW.user_identifier = '' THEN
        RETURN NEW;
    END IF;

    -- Insert or update user experiment participation
    INSERT INTO user_experiment_participation (
        user_identifier,
        experiment_id,
        variant_id,
        first_exposure_date,
        was_eligible_at_exposure,
        eligibility_criteria,
        total_impressions
    )
    SELECT 
        NEW.user_identifier,
        NEW.experiment_id,
        NEW.variant_id,
        NEW.impression_at,
        CASE 
            WHEN COALESCE((NEW.user_eligibility_status->>'was_already_subscribed')::boolean, false) = true THEN false
            WHEN COALESCE((NEW.user_eligibility_status->>'has_converted_previously')::boolean, false) = true THEN false
            ELSE true
        END,
        COALESCE(NEW.user_eligibility_status, '{}'),
        1
    ON CONFLICT (user_identifier, experiment_id) 
    DO UPDATE SET 
        total_impressions = user_experiment_participation.total_impressions + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversion status
CREATE OR REPLACE FUNCTION update_user_conversion_status()
RETURNS TRIGGER AS $$
DECLARE
    exposure_date TIMESTAMPTZ;
    was_eligible BOOLEAN;
BEGIN
    -- Only process if user_identifier is provided
    IF NEW.user_identifier IS NULL OR NEW.user_identifier = '' THEN
        RETURN NEW;
    END IF;

    -- Get user's first exposure info for this experiment
    SELECT 
        uep.first_exposure_date,
        uep.was_eligible_at_exposure
    INTO exposure_date, was_eligible
    FROM user_experiment_participation uep
    WHERE uep.user_identifier = NEW.user_identifier 
    AND uep.experiment_id = NEW.experiment_id;
    
    -- Update user participation if this is their first conversion and they were eligible
    IF was_eligible AND exposure_date IS NOT NULL THEN
        UPDATE user_experiment_participation 
        SET 
            has_converted = TRUE,
            first_conversion_date = NEW.created_at,
            conversion_within_window = (NEW.created_at <= exposure_date + INTERVAL '30 days'),
            updated_at = NOW()
        WHERE user_identifier = NEW.user_identifier 
        AND experiment_id = NEW.experiment_id
        AND has_converted = FALSE; -- Only update if this is their first conversion
        
        -- Create attribution record
        INSERT INTO conversion_attribution (
            conversion_id,
            user_identifier,
            experiment_id,
            variant_id,
            attribution_method,
            time_to_conversion_hours,
            conversion_value_attributed
        ) VALUES (
            NEW.id,
            NEW.user_identifier,
            NEW.experiment_id,
            NEW.variant_id,
            'first_exposure',
            EXTRACT(EPOCH FROM (NEW.created_at - exposure_date))/3600,
            COALESCE(NEW.conversion_value, 0)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers
-- -----------------------------------------------------------------

-- Trigger for impressions
DROP TRIGGER IF EXISTS trigger_update_user_participation ON impressions;
CREATE TRIGGER trigger_update_user_participation
    AFTER INSERT ON impressions
    FOR EACH ROW
    WHEN (NEW.user_identifier IS NOT NULL AND NEW.user_identifier != '')
    EXECUTE FUNCTION update_user_experiment_participation();

-- Trigger for conversions
DROP TRIGGER IF EXISTS trigger_update_conversion_status ON conversions;
CREATE TRIGGER trigger_update_conversion_status
    AFTER INSERT ON conversions
    FOR EACH ROW
    WHEN (NEW.user_identifier IS NOT NULL AND NEW.user_identifier != '')
    EXECUTE FUNCTION update_user_conversion_status();

-- 8. Data migration for existing records (safe migration)
-- -----------------------------------------------------------------

-- Safely migrate existing impression data
DO $$
BEGIN
    -- Check if we have any existing impression data to migrate
    IF EXISTS (SELECT 1 FROM impressions LIMIT 1) THEN
        INSERT INTO user_experiment_participation (
            user_identifier,
            experiment_id,
            variant_id,
            first_exposure_date,
            was_eligible_at_exposure,
            total_impressions,
            created_at
        )
        SELECT 
            COALESCE(
                NULLIF(i.user_identifier, ''), 
                NULLIF(i.session_identifier, ''), 
                'anonymous_' || i.id::text
            ) as user_identifier,
            i.experiment_id,
            i.variant_id,
            MIN(i.impression_at) as first_exposure_date,
            TRUE as was_eligible_at_exposure, -- Assume existing users were eligible
            COUNT(*) as total_impressions,
            MIN(i.impression_at) as created_at
        FROM impressions i
        WHERE COALESCE(
            NULLIF(i.user_identifier, ''), 
            NULLIF(i.session_identifier, ''), 
            'anonymous_' || i.id::text
        ) IS NOT NULL
        GROUP BY 
            COALESCE(
                NULLIF(i.user_identifier, ''), 
                NULLIF(i.session_identifier, ''), 
                'anonymous_' || i.id::text
            ),
            i.experiment_id,
            i.variant_id
        ON CONFLICT (user_identifier, experiment_id) DO NOTHING;
    END IF;
END $$;

-- Safely update conversion tracking for existing records
DO $$
BEGIN
    -- Check if we have any existing conversion data to migrate
    IF EXISTS (SELECT 1 FROM conversions LIMIT 1) THEN
        UPDATE user_experiment_participation uep
        SET 
            has_converted = TRUE,
            first_conversion_date = (
                SELECT MIN(c.created_at)
                FROM conversions c
                WHERE c.experiment_id = uep.experiment_id
                AND COALESCE(
                    NULLIF(c.user_identifier, ''), 
                    'anonymous_' || c.id::text
                ) = uep.user_identifier
            ),
            conversion_within_window = TRUE
        WHERE EXISTS (
            SELECT 1
            FROM conversions c
            WHERE c.experiment_id = uep.experiment_id
            AND COALESCE(
                NULLIF(c.user_identifier, ''), 
                'anonymous_' || c.id::text
            ) = uep.user_identifier
        );
    END IF;
END $$;

-- 9. Create utility functions for A/B testing
-- -----------------------------------------------------------------

-- Function to get user-level conversion rate for a variant
CREATE OR REPLACE FUNCTION get_variant_user_conversion_rate(variant_uuid UUID)
RETURNS TABLE (
    eligible_users BIGINT,
    converted_users BIGINT,
    conversion_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END) as eligible_users,
        COUNT(DISTINCT CASE WHEN uep.has_converted AND uep.was_eligible_at_exposure THEN uep.user_identifier END) as converted_users,
        ROUND(
            CASE 
                WHEN COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END) > 0 
                THEN (COUNT(DISTINCT CASE WHEN uep.has_converted AND uep.was_eligible_at_exposure THEN uep.user_identifier END)::decimal / 
                      COUNT(DISTINCT CASE WHEN uep.was_eligible_at_exposure THEN uep.user_identifier END)) * 100 
                ELSE 0 
            END, 2
        ) as conversion_rate
    FROM user_experiment_participation uep
    WHERE uep.variant_id = variant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check statistical significance between variants
CREATE OR REPLACE FUNCTION calculate_statistical_significance(variant_a_uuid UUID, variant_b_uuid UUID)
RETURNS TABLE (
    z_score DECIMAL(10,4),
    p_value DECIMAL(10,6),
    is_significant BOOLEAN
) AS $$
DECLARE
    a_converted BIGINT;
    a_eligible BIGINT;
    b_converted BIGINT;
    b_eligible BIGINT;
    p1 DECIMAL;
    p2 DECIMAL;
    pooled_p DECIMAL;
    standard_error DECIMAL;
    z_calc DECIMAL;
    p_calc DECIMAL;
BEGIN
    -- Get metrics for variant A
    SELECT eligible_users, converted_users 
    INTO a_eligible, a_converted
    FROM get_variant_user_conversion_rate(variant_a_uuid);
    
    -- Get metrics for variant B
    SELECT eligible_users, converted_users 
    INTO b_eligible, b_converted
    FROM get_variant_user_conversion_rate(variant_b_uuid);
    
    -- Calculate if we have sufficient data
    IF a_eligible = 0 OR b_eligible = 0 THEN
        RETURN QUERY SELECT 0::DECIMAL(10,4), 1::DECIMAL(10,6), FALSE;
        RETURN;
    END IF;
    
    -- Calculate proportions
    p1 := a_converted::DECIMAL / a_eligible;
    p2 := b_converted::DECIMAL / b_eligible;
    pooled_p := (a_converted + b_converted)::DECIMAL / (a_eligible + b_eligible);
    
    -- Calculate standard error
    standard_error := SQRT(pooled_p * (1 - pooled_p) * (1.0/a_eligible + 1.0/b_eligible));
    
    -- Calculate z-score
    IF standard_error = 0 THEN
        z_calc := 0;
    ELSE
        z_calc := (p1 - p2) / standard_error;
    END IF;
    
    -- Calculate p-value (simplified)
    CASE 
        WHEN ABS(z_calc) > 3.5 THEN p_calc := 0.0001;
        WHEN ABS(z_calc) > 2.576 THEN p_calc := 0.01;
        WHEN ABS(z_calc) > 1.96 THEN p_calc := 0.05;
        WHEN ABS(z_calc) > 1.645 THEN p_calc := 0.1;
        ELSE p_calc := 0.5;
    END CASE;
    
    RETURN QUERY SELECT 
        z_calc,
        p_calc,
        (p_calc < 0.05 AND a_eligible >= 100 AND b_eligible >= 100);
END;
$$ LANGUAGE plpgsql;

-- 10. Helper functions for application integration
-- -----------------------------------------------------------------

-- Function to log an impression with automatic eligibility checking
CREATE OR REPLACE FUNCTION log_user_impression(
    p_user_identifier TEXT,
    p_variant_id UUID,
    p_experiment_id UUID,
    p_was_already_subscribed BOOLEAN DEFAULT FALSE,
    p_user_session_count INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    impression_id UUID;
BEGIN
    INSERT INTO impressions (
        user_identifier,
        variant_id,
        experiment_id,
        impression_at,
        user_eligibility_status,
        is_first_exposure
    )
    VALUES (
        p_user_identifier,
        p_variant_id,
        p_experiment_id,
        NOW(),
        jsonb_build_object(
            'was_already_subscribed', p_was_already_subscribed,
            'user_session_count', p_user_session_count,
            'has_converted_previously', FALSE,
            'eligibility_checked_at', NOW()
        ),
        NOT EXISTS (
            SELECT 1 FROM impressions 
            WHERE user_identifier = p_user_identifier 
            AND experiment_id = p_experiment_id
        )
    )
    RETURNING id INTO impression_id;
    
    RETURN impression_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log a conversion with automatic attribution
CREATE OR REPLACE FUNCTION log_user_conversion(
    p_user_identifier TEXT,
    p_variant_id UUID,
    p_experiment_id UUID,
    p_conversion_type TEXT,
    p_conversion_value DECIMAL DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    conversion_id UUID;
BEGIN
    INSERT INTO conversions (
        user_identifier,
        variant_id,
        experiment_id,
        conversion_type,
        conversion_value,
        created_at,
        is_first_conversion_for_experiment
    )
    VALUES (
        p_user_identifier,
        p_variant_id,
        p_experiment_id,
        p_conversion_type,
        p_conversion_value,
        NOW(),
        NOT EXISTS (
            SELECT 1 FROM conversions 
            WHERE user_identifier = p_user_identifier 
            AND experiment_id = p_experiment_id
        )
    )
    RETURNING id INTO conversion_id;
    
    RETURN conversion_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Verification queries
-- -----------------------------------------------------------------

-- Query to verify the schema updates
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('impressions', 'conversions', 'user_experiment_participation', 'conversion_attribution')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Query to check index creation
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('impressions', 'conversions', 'user_experiment_participation', 'conversion_attribution')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- =================================================================
-- End of Schema Updates
-- =================================================================

-- Usage Examples:
-- 
-- 1. Log an impression with eligibility check:
-- SELECT log_user_impression('user123', 'variant-uuid', 'experiment-uuid', false, 1);
--
-- 2. Log a conversion:
-- SELECT log_user_conversion('user123', 'variant-uuid', 'experiment-uuid', 'quiz_submission', 10.0);
--
-- 3. Get user-level metrics for a variant:
-- SELECT * FROM get_variant_user_conversion_rate('variant-uuid-here');
--
-- 4. Check statistical significance:
-- SELECT * FROM calculate_statistical_significance('variant-a-uuid', 'variant-b-uuid');
--
-- 5. View experiment quality:
-- SELECT * FROM experiment_quality_metrics WHERE experiment_name = 'Homepage Test';
--
-- 6. View user-level metrics:
-- SELECT * FROM user_level_experiment_metrics WHERE experiment_name = 'Homepage Test'; 