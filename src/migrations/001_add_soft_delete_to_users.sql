-- Migration to add soft-delete functionality to user_profiles

-- Add the deleted_at column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Add a comment to describe the new column's purpose
COMMENT ON COLUMN public.user_profiles.deleted_at IS 'Timestamp for when a user is soft-deleted. NULL if the user is active.';

-- Optional: Create an index for faster querying of active users
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_users ON public.user_profiles (id) WHERE deleted_at IS NULL; 