CREATE OR REPLACE FUNCTION public.verify_user_and_token(
    p_token_id uuid,
    p_user_id uuid
)
RETURNS public.user_profiles -- Returns a single user_profiles row
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_profile public.user_profiles%ROWTYPE;
BEGIN
    -- Update the token to mark it as used
    UPDATE email_verification_tokens
    SET 
        is_used = TRUE,
        used_at = NOW()
    WHERE id = p_token_id;

    -- Update the user's profile to mark as verified
    UPDATE user_profiles
    SET 
        is_email_verified = TRUE,
        email_verified_at = NOW()
    WHERE id = p_user_id;

    -- Fetch and return the updated user profile
    SELECT *
    INTO updated_profile
    FROM user_profiles
    WHERE id = p_user_id;

    RETURN updated_profile;
END;
$$; 