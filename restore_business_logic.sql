-- MIGRATION SCRIPT TO RESTORE CRITICAL BUSINESS LOGIC (V2 - IDEMPOTENT)
-- This script can be run multiple times without causing errors.

-- STEP 1: Restore missing tables, but only if they do not already exist.
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    quiz_name text NOT NULL,
    score integer,
    result_type text,
    earned_gems integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.quiz_attempts IS 'Logs every quiz attempt by a user, including scores and any gems earned.';

CREATE TABLE IF NOT EXISTS public.engagement_rewards (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    reward_type text NOT NULL,
    reward_amount integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT engagement_rewards_pkey PRIMARY KEY (id),
    CONSTRAINT engagement_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.engagement_rewards IS 'Tracks gems awarded to users for specific, non-transactional engagements like daily logins.';

-- STEP 2: Create indexes only if they do not already exist.
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_rewards_user_id ON public.engagement_rewards USING btree (user_id);

-- STEP 3: Create or replace all necessary functions.
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_user_experiment_participation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.user_experiment_participation (user_id, experiment_id, variant_id, first_exposure_date, was_eligible_at_exposure, eligibility_criteria, total_impressions, has_converted, created_at, updated_at)
  VALUES (NEW.user_id, NEW.experiment_id, NEW.variant_id, NEW.impression_at, COALESCE(NEW.user_was_eligible, true), COALESCE(NEW.user_eligibility_status, '{}'::jsonb), 1, false, NOW(), NOW())
  ON CONFLICT (user_id, experiment_id)
  DO UPDATE SET
    total_impressions = user_experiment_participation.total_impressions + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_conversion_attribution()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    exposure_date TIMESTAMPTZ;
    hours_to_conversion INTEGER;
BEGIN
    SELECT first_exposure_date INTO exposure_date FROM public.user_experiment_participation 
    WHERE user_id = NEW.user_id AND experiment_id = NEW.experiment_id;
    
    IF exposure_date IS NULL THEN RETURN NEW; END IF;
    
    hours_to_conversion := EXTRACT(EPOCH FROM (NEW.created_at - exposure_date)) / 3600;
    
    INSERT INTO public.conversion_attribution (conversion_id, user_id, experiment_id, variant_id, attribution_method, time_to_conversion_hours, conversion_value_attributed)
    VALUES (NEW.id, NEW.user_id, NEW.experiment_id, NEW.variant_id, 'first_exposure', hours_to_conversion, NEW.conversion_value)
    ON CONFLICT (conversion_id) DO NOTHING;

    UPDATE public.user_experiment_participation 
    SET has_converted = TRUE, first_conversion_date = COALESCE(user_experiment_participation.first_conversion_date, NEW.created_at), updated_at = NOW()
    WHERE user_id = NEW.user_id AND experiment_id = NEW.experiment_id;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_quiz_verification_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.is_email_verified IS DISTINCT FROM NEW.is_email_verified THEN
        IF NEW.is_email_verified IS TRUE THEN NEW.verification_timestamp = NOW();
        ELSE NEW.verification_timestamp = NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_daily_login(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_last_login_date DATE;
  v_bonus INTEGER := 5;
BEGIN
  SELECT MAX(created_at)::DATE INTO v_last_login_date
  FROM public.engagement_rewards WHERE user_id = p_user_id AND reward_type = 'daily_login';
  
  IF v_last_login_date = CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily bonus already claimed');
  END IF;
  
  -- Record the reward event
  INSERT INTO public.engagement_rewards (user_id, reward_type, reward_amount)
  VALUES (p_user_id, 'daily_login', v_bonus);
  
  -- Actually award the gems by calling the transaction function
  PERFORM public.process_gem_transaction(
    p_user_id,
    v_bonus,
    'admin_adjustment', -- Using 'admin_adjustment' as a placeholder type
    'daily_login'::text,
    'Daily login bonus'
  );
  
  RETURN jsonb_build_object('success', true, 'bonus_awarded', v_bonus);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- The database may have an old version of the function below with different parameter names.
-- To prevent an error, we explicitly drop it first, using its data type signature.
DROP FUNCTION IF EXISTS public.handle_quiz_submission(uuid, text, integer, text, text);
CREATE OR REPLACE FUNCTION public.handle_quiz_submission(p_user_id uuid, p_email text, p_score integer, p_result_type text, p_quiz_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_quiz_bonus INTEGER := 25;
BEGIN
    IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist.', p_user_id;
    END IF;

    -- Record the quiz attempt
    INSERT INTO public.quiz_attempts (user_id, quiz_name, score, result_type, earned_gems)
    VALUES (p_user_id, p_quiz_name, p_score, p_result_type, v_quiz_bonus);
    
    -- Actually award the gems by calling the transaction function
    PERFORM public.process_gem_transaction(
        p_user_id,
        v_quiz_bonus,
        'admin_adjustment', -- Using 'admin_adjustment' as a placeholder type
        p_quiz_name::text,
        'Quiz completion bonus'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Quiz submission handled.', 'gems_earned_for_quiz', v_quiz_bonus);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- STEP 4: Drop and re-create all triggers to ensure they are correctly defined.
DROP TRIGGER IF EXISTS set_experiments_updated_at ON public.experiments;
CREATE TRIGGER set_experiments_updated_at BEFORE UPDATE ON public.experiments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_variants_updated_at ON public.variants;
CREATE TRIGGER set_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS trigger_track_user_participation ON public.impressions;
CREATE TRIGGER trigger_track_user_participation AFTER INSERT ON public.impressions FOR EACH ROW EXECUTE FUNCTION track_user_experiment_participation();

DROP TRIGGER IF EXISTS trigger_track_conversion_attribution ON public.conversions;
CREATE TRIGGER trigger_track_conversion_attribution AFTER INSERT ON public.conversions FOR EACH ROW EXECUTE FUNCTION track_conversion_attribution();

DROP TRIGGER IF EXISTS trigger_quiz_verification_timestamp ON public.quiz_results;
CREATE TRIGGER trigger_quiz_verification_timestamp BEFORE UPDATE ON public.quiz_results FOR EACH ROW EXECUTE FUNCTION update_quiz_verification_timestamp(); 