-- MIGRATION: GAMIFICATION SYSTEM V2 (Corrected)
-- This script safely drops and recreates the gamification resources
-- to resolve potential schema caching or partial migration issues.

-- Step 1: Drop existing objects if they exist to ensure a clean slate
DROP FUNCTION IF EXISTS public.log_user_engagement(UUID, TEXT, JSONB);
DROP TABLE IF EXISTS public.gem_transactions;
DROP TABLE IF EXISTS public.user_engagements;

-- Step 2: Re-create the user_engagements table
CREATE TABLE public.user_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.user_engagements IS 'A log of all significant user actions for gamification and analytics.';
COMMENT ON COLUMN public.user_engagements.event_type IS 'The type of action, e.g., DOWNLOADED_BOOK_CHAPTERS, COMPLETED_QUIZ.';
COMMENT ON COLUMN public.user_engagements.event_metadata IS 'Additional data about the event, like quiz score or content ID.';
CREATE INDEX idx_user_engagements_user_id ON public.user_engagements(user_id);
CREATE INDEX idx_user_engagements_event_type ON public.user_engagements(event_type);

-- Step 3: Re-create the gem_transactions table
CREATE TABLE public.gem_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    source_engagement_id UUID REFERENCES public.user_engagements(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount INT NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.gem_transactions IS 'An immutable ledger of all gem credits and debits for a user.';
COMMENT ON COLUMN public.gem_transactions.source_engagement_id IS 'Links the transaction to a specific user action that generated it.';
CREATE INDEX idx_gem_transactions_user_id ON public.gem_transactions(user_id);

-- Step 4: Re-create the main RPC function
CREATE OR REPLACE FUNCTION public.log_user_engagement(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_engagement_id UUID;
    v_gems_to_award INT;
    v_new_gem_balance INT;
    v_response JSONB;
BEGIN
    -- Log the engagement event
    INSERT INTO public.user_engagements (user_id, event_type, event_metadata)
    VALUES (p_user_id, p_event_type, p_event_metadata)
    RETURNING id INTO v_engagement_id;

    -- Determine gems to award based on event_type
    v_gems_to_award := CASE p_event_type
        WHEN 'DOWNLOADED_BOOK_CHAPTERS' THEN 10
        WHEN 'COMPLETED_QUIZ_LOVELAB' THEN 25
        ELSE 0
    END;

    -- If there are gems to award, process the transaction
    IF v_gems_to_award > 0 THEN
        INSERT INTO public.gem_transactions (user_id, source_engagement_id, transaction_type, amount, description)
        VALUES (p_user_id, v_engagement_id, 'CREDIT', v_gems_to_award, 'Reward for: ' || p_event_type);

        UPDATE public.user_profiles
        SET insight_gems = insight_gems + v_gems_to_award
        WHERE id = p_user_id
        RETURNING insight_gems INTO v_new_gem_balance;

        v_response := jsonb_build_object(
            'success', true,
            'message', 'Engagement logged and gems awarded.',
            'engagement_id', v_engagement_id,
            'gems_awarded', v_gems_to_award,
            'new_gem_balance', v_new_gem_balance
        );
    ELSE
        v_response := jsonb_build_object(
            'success', true,
            'message', 'Engagement logged. No gems awarded for this event type.',
            'engagement_id', v_engagement_id,
            'gems_awarded', 0
        );
    END IF;

    RETURN v_response;
END;
$$;

COMMENT ON FUNCTION public.log_user_engagement(UUID, TEXT, JSONB) IS 'Logs a user engagement event, determines if gems should be awarded, creates a transaction, and updates the user''s gem balance.'; 