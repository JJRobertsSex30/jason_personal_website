-- MIGRATION SCRIPT: FULL CLEANUP (v4 - Correct Order)
-- This script drops all objects we need to modify, in the correct dependency order.
-- This will prepare the database for the new schema.

-- STEP 1: Drop all views that depend on the tables.
DROP VIEW IF EXISTS public.ab_test_analytics;
DROP VIEW IF EXISTS public.quiz_analytics_summary;
DROP VIEW IF EXISTS public.unverified_quiz_emails;

-- STEP 2: Drop all functions. Use CASCADE to also drop the triggers that depend on them.
DROP FUNCTION IF EXISTS public.track_conversion_attribution() CASCADE;
DROP FUNCTION IF EXISTS public.track_user_experiment_participation() CASCADE;
DROP FUNCTION IF EXISTS public.update_quiz_verification_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_set_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.find_quiz_results_by_validation(text, int4);
DROP FUNCTION IF EXISTS public.get_marketing_attribution(int4);
DROP FUNCTION IF EXISTS public.get_quiz_stats(text, int4);
DROP FUNCTION IF EXISTS public.verify_quiz_email(text, text);

-- STEP 3: Drop all tables that need to be modified.
-- Order is important: tables with foreign keys are dropped before the tables they reference.
DROP TABLE IF EXISTS public.conversion_attribution;
DROP TABLE IF EXISTS public.user_experiment_participation;
DROP TABLE IF EXISTS public.conversions;
DROP TABLE IF EXISTS public.impressions;
DROP TABLE IF EXISTS public.quiz_results;
DROP TABLE IF EXISTS public.user_engagements;
DROP TABLE IF EXISTS public.user_engagement_tracking;

--
-- STEP 4: Pre-create functions that tables depend on
--
CREATE OR REPLACE FUNCTION public.update_quiz_verification_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if the is_email_verified flag was changed from false to true
    IF NEW.is_email_verified IS TRUE AND OLD.is_email_verified IS FALSE THEN
        NEW.verification_timestamp = NOW();
    END IF;
    RETURN NEW;
END;
$function$;

--
-- STEP 5: Re-create tables one-by-one with corrected schema
--

-- Table: user_engagements
CREATE TABLE public.user_engagements (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	event_type text NOT NULL,
	event_metadata jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT user_engagements_pkey PRIMARY KEY (id),
    CONSTRAINT user_engagements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- Table: user_engagement_tracking
CREATE TABLE public.user_engagement_tracking (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	engagement_type text NOT NULL,
	experiment_context text NULL,
	variant_context text NULL,
	page_url text NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT timezone('utc'::text, now()) NULL,
	CONSTRAINT user_engagement_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT fk_user_engagement_tracking_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_engagement_tracking_user_id ON public.user_engagement_tracking USING btree (user_id);
CREATE INDEX idx_user_engagement_context ON public.user_engagement_tracking USING btree (experiment_context);
CREATE INDEX idx_user_engagement_date ON public.user_engagement_tracking USING btree (created_at);
CREATE INDEX idx_user_engagement_metadata ON public.user_engagement_tracking USING gin (metadata);
CREATE INDEX idx_user_engagement_type ON public.user_engagement_tracking USING btree (engagement_type);

-- Table: quiz_results
CREATE TABLE public.quiz_results (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	attempt_timestamp timestamp DEFAULT now() NULL,
	quiz_type text NOT NULL,
	quiz_version text DEFAULT '1.0'::text NULL,
	scores jsonb NULL,
	result_type text NOT NULL,
	result_details jsonb NULL,
	questions_and_answers jsonb NOT NULL,
	quiz_metadata jsonb NULL,
	first_name text NULL,
	user_agent text NULL,
	ip_address inet NULL,
	referrer text NULL,
	utm_source text NULL,
	utm_medium text NULL,
	utm_campaign text NULL,
	country_code text NULL,
	device_type text NULL,
	is_email_verified bool DEFAULT false NULL,
	verification_timestamp timestamp NULL,
	session_identifier uuid NULL,
	experiment_data jsonb NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT quiz_results_pkey PRIMARY KEY (id),
    CONSTRAINT fk_quiz_results_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
	CONSTRAINT check_quiz_version_format CHECK ((quiz_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'::text))
);
CREATE INDEX idx_quiz_results_user_id ON public.quiz_results USING btree (user_id);
CREATE INDEX idx_quiz_results_user_id_type ON public.quiz_results USING btree (user_id, quiz_type);
CREATE TRIGGER trigger_quiz_verification_timestamp BEFORE UPDATE ON public.quiz_results FOR EACH ROW EXECUTE FUNCTION update_quiz_verification_timestamp();

-- Table: impressions
CREATE TABLE public.impressions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	variant_id uuid NOT NULL,
	session_identifier text NULL,
	impression_at timestamptz DEFAULT now() NOT NULL,
	experiment_id uuid NOT NULL,
	page_url text NULL,
	user_agent text NULL,
	country_code varchar(2) NULL,
	region varchar(100) NULL,
	city varchar(100) NULL,
	device_type public."device_type_enum" NULL,
	screen_resolution varchar(20) NULL,
	viewport_size varchar(20) NULL,
	connection_type public."connection_type_enum" NULL,
	language_code varchar(10) NULL,
	time_zone varchar(50) NULL,
	utm_source varchar(100) NULL,
	utm_medium varchar(100) NULL,
	utm_campaign varchar(100) NULL,
	time_on_page int4 NULL,
	scroll_depth_percent int4 NULL,
	page_load_time int4 NULL,
	bounce bool DEFAULT false NULL,
	is_first_exposure bool DEFAULT false NULL,
	user_was_eligible bool DEFAULT true NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	user_eligibility_status jsonb DEFAULT '{}'::jsonb NULL,
	user_context jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT impressions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_impressions_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
	CONSTRAINT fk_impressions_experiment FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE,
	CONSTRAINT fk_impressions_variant FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE,
	CONSTRAINT chk_impressions_scroll_depth CHECK (((scroll_depth_percent >= 0) AND (scroll_depth_percent <= 100)))
);
CREATE INDEX idx_impressions_user_id ON public.impressions USING btree (user_id);
CREATE INDEX idx_impressions_user_variant ON public.impressions USING btree (user_id, variant_id);

-- Table: conversions
CREATE TABLE public.conversions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	variant_id uuid NOT NULL,
	experiment_id uuid NOT NULL,
	session_identifier text NULL,
	conversion_type text NOT NULL,
	details jsonb NULL,
	created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
	country_code varchar(2) NULL,
	device_type public."device_type_enum" NULL,
	referrer_source varchar(200) NULL,
	utm_source varchar(100) NULL,
	utm_medium varchar(100) NULL,
	utm_campaign varchar(100) NULL,
	conversion_value numeric(10, 2) NULL,
	time_to_convert int4 NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	is_first_conversion_for_experiment bool DEFAULT true NULL,
	conversion_attribution_source text DEFAULT 'direct'::text NULL,
	conversion_window_days int4 DEFAULT 30 NULL,
	original_exposure_date timestamptz NULL,
	conversion_eligibility_verified bool DEFAULT false NULL,
	conversion_context jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT conversions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_conversions_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
	CONSTRAINT conversions_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE,
	CONSTRAINT conversions_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE,
	CONSTRAINT chk_conversions_value CHECK ((conversion_value >= (0)::numeric))
);
CREATE INDEX idx_conversions_user_id ON public.conversions USING btree (user_id);
CREATE INDEX idx_conversions_user_variant ON public.conversions USING btree (user_id, variant_id);

-- Table: user_experiment_participation
CREATE TABLE public.user_experiment_participation (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	experiment_id uuid NOT NULL,
	variant_id uuid NOT NULL,
	first_exposure_date timestamptz DEFAULT now() NOT NULL,
	was_eligible_at_exposure bool DEFAULT true NOT NULL,
	eligibility_criteria jsonb DEFAULT '{}'::jsonb NULL,
	total_impressions int4 DEFAULT 1 NULL,
	has_converted bool DEFAULT false NULL,
	first_conversion_date timestamptz NULL,
	conversion_within_window bool DEFAULT false NULL,
	created_at timestamptz DEFAULT timezone('utc'::text, now()) NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT user_experiment_participation_pkey PRIMARY KEY (id),
    CONSTRAINT user_experiment_participation_user_id_experiment_id_key UNIQUE (user_id, experiment_id),
    CONSTRAINT fk_user_experiment_participation_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
	CONSTRAINT user_experiment_participation_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE,
	CONSTRAINT user_experiment_participation_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE,
    CONSTRAINT user_experiment_participation_check CHECK (((first_conversion_date IS NULL) OR (first_conversion_date >= first_exposure_date)))
);
CREATE INDEX idx_user_exp_participation_user_id ON public.user_experiment_participation USING btree (user_id);

-- Table: conversion_attribution
CREATE TABLE public.conversion_attribution (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
	conversion_id uuid NOT NULL,
	experiment_id uuid NOT NULL,
	variant_id uuid NOT NULL,
	attribution_method text DEFAULT 'first_exposure'::text NOT NULL,
	attribution_confidence numeric(3, 2) DEFAULT 1.00 NULL,
	time_to_conversion_hours int4 NULL,
	conversion_value_attributed numeric(10, 2) NULL,
	created_at timestamptz DEFAULT timezone('utc'::text, now()) NULL,
	CONSTRAINT conversion_attribution_pkey PRIMARY KEY (id),
    CONSTRAINT conversion_attribution_conversion_id_key UNIQUE (conversion_id),
    CONSTRAINT fk_conversion_attribution_user FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
	CONSTRAINT conversion_attribution_conversion_id_fkey FOREIGN KEY (conversion_id) REFERENCES public.conversions(id) ON DELETE CASCADE,
	CONSTRAINT conversion_attribution_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE,
	CONSTRAINT conversion_attribution_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE,
    CONSTRAINT conversion_attribution_attribution_confidence_check CHECK (((attribution_confidence >= (0)::numeric) AND (attribution_confidence <= (1)::numeric))),
	CONSTRAINT conversion_attribution_time_to_conversion_hours_check CHECK ((time_to_conversion_hours >= 0))
);
CREATE INDEX idx_conversion_attribution_user_id ON public.conversion_attribution USING btree (user_id);

--
-- STEP 6: Re-create views and functions
--
CREATE OR REPLACE VIEW public.quiz_analytics_summary AS
SELECT 
    qr.quiz_type,
    count(*) AS total_submissions,
    count(DISTINCT qr.user_id) AS unique_users,
    count(*) FILTER (WHERE qr.is_email_verified = true) AS verified_submissions,
    round(count(*) FILTER (WHERE qr.is_email_verified = true)::numeric * 100.0 / count(*)::numeric, 2) AS verification_rate_percent,
    avg((qr.scores ->> 'total'::text)::numeric) AS avg_numeric_score,
    mode() WITHIN GROUP (ORDER BY qr.result_type) AS most_common_result,
    count(DISTINCT qr.country_code) AS countries_reached,
    count(*) FILTER (WHERE qr.utm_source IS NOT NULL) AS attributed_submissions,
    date_trunc('day'::text, qr.attempt_timestamp) AS submission_date
FROM public.quiz_results qr
WHERE qr.attempt_timestamp >= (now() - '90 days'::interval)
GROUP BY qr.quiz_type, (date_trunc('day'::text, qr.attempt_timestamp))
ORDER BY (date_trunc('day'::text, qr.attempt_timestamp)) DESC, (count(*)) DESC;

CREATE OR REPLACE VIEW public.unverified_quiz_emails AS 
SELECT 
    qr.id,
    up.email,
    qr.first_name,
    qr.quiz_type,
    qr.result_type,
    qr.attempt_timestamp,
    qr.utm_source,
    qr.utm_campaign,
    EXTRACT(epoch FROM now() - qr.attempt_timestamp::timestamp with time zone) / 3600::numeric AS hours_since_attempt
FROM public.quiz_results qr
JOIN public.user_profiles up ON qr.user_id = up.id
WHERE qr.is_email_verified = false AND qr.attempt_timestamp >= (now() - '7 days'::interval)
ORDER BY qr.attempt_timestamp DESC;

CREATE OR REPLACE VIEW public.ab_test_analytics AS 
SELECT e.id AS experiment_id,
    e.name AS experiment_name,
    v.id AS variant_id,
    v.name AS variant_name,
    count(
        CASE
            WHEN p.was_eligible_at_exposure THEN 1
            ELSE NULL::integer
        END) AS eligible_participants,
    count(
        CASE
            WHEN p.was_eligible_at_exposure AND p.has_converted THEN 1
            ELSE NULL::integer
        END) AS eligible_conversions,
        CASE
            WHEN count(
            CASE
                WHEN p.was_eligible_at_exposure THEN 1
                ELSE NULL::integer
            END) > 0 THEN count(
            CASE
                WHEN p.was_eligible_at_exposure AND p.has_converted THEN 1
                ELSE NULL::integer
            END)::numeric / count(
            CASE
                WHEN p.was_eligible_at_exposure THEN 1
                ELSE NULL::integer
            END)::numeric * 100::numeric
            ELSE 0::numeric
        END AS conversion_rate_percent,
    avg(
        CASE
            WHEN ca.time_to_conversion_hours IS NOT NULL THEN ca.time_to_conversion_hours
            ELSE NULL::integer
        END) AS avg_time_to_conversion_hours,
    sum(
        CASE
            WHEN p.was_eligible_at_exposure THEN ca.conversion_value_attributed
            ELSE 0::numeric
        END) AS total_attributed_value
   FROM public.experiments e
     JOIN public.variants v ON v.experiment_id = e.id
     LEFT JOIN public.user_experiment_participation p ON p.experiment_id = e.id AND p.variant_id = v.id
     LEFT JOIN public.conversion_attribution ca ON ca.experiment_id = e.id AND ca.variant_id = v.id AND ca.user_id = p.user_id
  GROUP BY e.id, e.name, v.id, v.name
  ORDER BY e.name, v.name;

CREATE OR REPLACE FUNCTION public.find_quiz_results_by_validation(validation_status text, limit_results integer DEFAULT 100)
 RETURNS TABLE(id uuid, email text, quiz_type text, result_type text, attempt_timestamp timestamp without time zone, validation_details jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        qr.id,
        up.email,
        qr.quiz_type,
        qr.result_type,
        qr.attempt_timestamp,
        qr.experiment_data->'email_validation' as validation_details
    FROM public.quiz_results qr
    JOIN public.user_profiles up ON qr.user_id = up.id
    WHERE qr.experiment_data->'email_validation'->>'status' = validation_status
    ORDER BY qr.attempt_timestamp DESC
    LIMIT limit_results;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketing_attribution(days_back integer DEFAULT 30)
 RETURNS TABLE(utm_source text, utm_campaign text, utm_medium text, total_attempts bigint, verified_attempts bigint, conversion_rate numeric, top_quiz_type text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        qr.utm_source,
        qr.utm_campaign,
        qr.utm_medium,
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE qr.is_email_verified = TRUE) as verified_attempts,
        ROUND(
            (COUNT(*) FILTER (WHERE qr.is_email_verified = TRUE) * 100.0 / COUNT(*)), 2
        ) as conversion_rate,
        MODE() WITHIN GROUP (ORDER BY qr.quiz_type) as top_quiz_type
    FROM public.quiz_results qr
    WHERE qr.attempt_timestamp >= NOW() - INTERVAL '1 day' * days_back
      AND (qr.utm_source IS NOT NULL OR qr.utm_campaign IS NOT NULL)
    GROUP BY qr.utm_source, qr.utm_campaign, qr.utm_medium
    HAVING COUNT(*) >= 5
    ORDER BY total_attempts DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_quiz_stats(quiz_type_filter text DEFAULT NULL::text, days_back integer DEFAULT 30)
 RETURNS TABLE(quiz_type text, total_attempts bigint, verified_emails bigint, verification_rate numeric, avg_score numeric, unique_participants bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        qr.quiz_type,
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE qr.is_email_verified = TRUE) as verified_emails,
        ROUND(
            (COUNT(*) FILTER (WHERE qr.is_email_verified = TRUE) * 100.0 / COUNT(*)), 2
        ) as verification_rate,
        ROUND(AVG((qr.scores->>'total')::DECIMAL), 2) as avg_score,
        COUNT(DISTINCT qr.user_id) as unique_participants
    FROM public.quiz_results qr
    WHERE (quiz_type_filter IS NULL OR qr.quiz_type = quiz_type_filter)
      AND qr.attempt_timestamp >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY qr.quiz_type
    ORDER BY total_attempts DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_quiz_email(email_to_verify text, quiz_type_filter text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    updated_count INTEGER;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.user_profiles WHERE email = email_to_verify;

    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    UPDATE public.quiz_results 
    SET is_email_verified = TRUE,
        verification_timestamp = NOW()
    WHERE user_id = v_user_id
      AND is_email_verified = FALSE
      AND (quiz_type_filter IS NULL OR quiz_type = quiz_type_filter);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$function$; 