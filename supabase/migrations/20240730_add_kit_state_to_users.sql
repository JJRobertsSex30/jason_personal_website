-- Add kit_state to user_profiles to cache user status from ConvertKit
ALTER TABLE public.user_profiles
ADD COLUMN kit_state TEXT DEFAULT 'unconfirmed';

-- Add an index for faster filtering on the new state column
CREATE INDEX IF NOT EXISTS idx_user_profiles_kit_state ON public.user_profiles(kit_state);

-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.user_profiles.kit_state IS 'Caches the user''s state from ConvertKit (e.g., active, cancelled, bounced) for fast filtering on the admin dashboard.'; 