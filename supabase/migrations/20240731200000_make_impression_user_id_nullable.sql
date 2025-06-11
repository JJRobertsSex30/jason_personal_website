-- Drop the existing foreign key constraint first
ALTER TABLE public.impressions
DROP CONSTRAINT IF EXISTS fk_impressions_user;

-- Make the user_id column nullable
ALTER TABLE public.impressions
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.impressions.user_id IS 'The user associated with this impression. Can be NULL for anonymous, pre-conversion impressions.'; 