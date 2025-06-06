-- Add a secure, single-use action token to user_profiles
-- This token will be used to authorize actions for non-logged-in users,
-- like awarding gems for downloading a file from a confirmation email.

ALTER TABLE public.user_profiles
ADD COLUMN action_token UUID DEFAULT uuid_generate_v4();

COMMENT ON COLUMN public.user_profiles.action_token IS 'A secure, single-use token for authorizing actions without a full login session.';

-- Add an index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_action_token ON public.user_profiles(action_token); 