-- Add provider_reply column to reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS provider_reply TEXT;

-- Allow providers to update the provider_reply field on their own reviews
CREATE POLICY "Provider can reply to own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );
