-- Migration: Create helper functions to check auth.users for email/nickname existence
-- These functions use SECURITY DEFINER to access the auth schema safely

-- Function to check if an email already exists in auth.users
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;

-- Function to check if a nickname already exists in auth.users metadata OR profiles
CREATE OR REPLACE FUNCTION public.check_nickname_exists(check_nickname TEXT, exclude_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check in auth.users raw_user_meta_data
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(raw_user_meta_data->>'nickname') = LOWER(check_nickname)
      AND (exclude_email IS NULL OR LOWER(email) != LOWER(exclude_email))
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check in profiles table (in case nickname was updated there but not in auth metadata)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(nickname) = LOWER(check_nickname)
      AND (exclude_email IS NULL OR LOWER(email) != LOWER(exclude_email))
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant execute permissions to the service_role (used by API route)
-- anon and authenticated should NOT have access to these
REVOKE ALL ON FUNCTION public.check_email_exists(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.check_nickname_exists(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_nickname_exists(TEXT, TEXT) TO service_role;
