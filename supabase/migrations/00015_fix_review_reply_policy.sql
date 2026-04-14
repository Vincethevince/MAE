-- Fix the broken review-reply RLS policy introduced in 00011_review_reply.sql.
--
-- The policy referenced `providers.user_id` but the column is `providers.profile_id`.
-- This caused a "column user_id does not exist" error whenever Postgres evaluated
-- the policy (e.g. when an authenticated provider tried to reply to a review).

DROP POLICY IF EXISTS "Provider can reply to own reviews" ON reviews;

CREATE POLICY "Provider can reply to own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );
