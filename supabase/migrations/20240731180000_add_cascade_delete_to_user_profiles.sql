ALTER TABLE public.user_profiles
ADD CONSTRAINT fk_auth_users
FOREIGN KEY (id) 
REFERENCES auth.users (id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_auth_users ON public.user_profiles IS 'Ensures that when a user is deleted from auth.users, their corresponding profile is also automatically deleted.'; 