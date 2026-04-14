-- Fix the handle_new_user trigger that runs after auth.users INSERT.
--
-- Problems addressed:
--   1. Missing SET search_path — SECURITY DEFINER functions without an explicit
--      search_path are susceptible to search_path injection and generate a
--      security warning in newer Supabase versions (which can surface as a 500).
--   2. Role not picked up from metadata — newly-registered providers always got
--      role='user' even when they selected 'provider' in the UI.
--   3. No conflict handling — a duplicate id (e.g. from a retried signup)
--      caused a unique-constraint violation that rolled back the entire auth
--      transaction, making signup appear to fail with a generic 500.
--   4. No exception handler — any trigger error aborts the Supabase signUp call
--      and the client sees "Database error saving new user" (unmapped → generic
--      "Registrierung fehlgeschlagen" message in the UI).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public          -- prevents search_path injection
AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Safely cast the role from metadata, defaulting to 'user'.
  BEGIN
    v_role := COALESCE(
      (new.raw_user_meta_data ->> 'role')::user_role,
      'user'::user_role
    );
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'user'::user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    v_role
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email     = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      role      = COALESCE(EXCLUDED.role, profiles.role),
      updated_at = now();

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error so it appears in Supabase / Postgres logs,
    -- but do NOT re-raise — this allows the auth.users INSERT to
    -- succeed so the user can log in.  A missing profile can be
    -- created lazily on first authenticated request if needed.
    RAISE WARNING
      'handle_new_user: profile upsert failed for user %: % (SQLSTATE: %)',
      new.id, SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;
