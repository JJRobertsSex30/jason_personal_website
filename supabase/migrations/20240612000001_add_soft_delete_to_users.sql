-- add_soft_delete_to_users.sql

ALTER TABLE public.user_profiles
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.user_profiles.deleted_at IS 'Timestamp for soft deletion. If NULL, the user is active.'; 