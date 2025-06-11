-- verify_user_and_token.sql

CREATE OR REPLACE FUNCTION public.verify_user_and_token(p_token_id uuid, p_user_id uuid)
RETURNS SETOF public.user_profiles LANGUAGE plpgsql AS $$
DECLARE
  v_updated_profile public.user_profiles;
BEGIN
  -- Update the token to mark it as used
  UPDATE public.email_verification_tokens
  SET 
    is_used = TRUE,
    used_at = NOW()
  WHERE id = p_token_id AND user_profile_id = p_user_id;

  -- If the token was found and updated, then update the user profile
  IF FOUND THEN
    UPDATE public.user_profiles
    SET 
      is_email_verified = TRUE,
      email_verified_at = NOW(),
      updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO v_updated_profile;

    RETURN NEXT v_updated_profile;
  END IF;

  RETURN;
END;
$$; 