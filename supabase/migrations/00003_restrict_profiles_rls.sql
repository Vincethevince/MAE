-- Tighten profiles RLS: only the profile owner may read sensitive fields (email, phone).
-- Other users (including unauthenticated) can read full_name for display purposes via
-- the public_profiles view below.
--
-- We cannot restrict SELECT to specific columns via RLS (that requires column-level
-- privileges), so we:
--   1. Drop the open SELECT policy
--   2. Add a policy allowing a user to SELECT their own row in full
--   3. Expose a narrow view for public display (name only)

-- Step 1: Drop the overly broad read policy
drop policy if exists "Profiles are viewable by everyone" on profiles;

-- Step 2: Users can read their own full profile
create policy "Users can read own profile"
  on profiles
  for select
  using (auth.uid() = id);

-- Step 3: Public read-only view exposing only the display name
-- Used by getProviderReviews, public provider pages, etc.
create or replace view public_profiles as
  select id, full_name
  from profiles;

-- Grant read access on the view to authenticated and anonymous roles
grant select on public_profiles to anon, authenticated;
