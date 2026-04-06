-- Provider schedule blocks (vacation, holidays, etc.)
CREATE TABLE provider_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  label text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE INDEX idx_provider_blocks_provider_time
  ON provider_blocks (provider_id, start_time, end_time);

ALTER TABLE provider_blocks ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own blocks (INSERT/UPDATE/DELETE only; SELECT is covered separately)
CREATE POLICY "providers_manage_own_blocks" ON provider_blocks
  FOR INSERT, UPDATE, DELETE
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

-- Anyone can read blocks (needed for slot availability computation)
CREATE POLICY "blocks_readable_by_all" ON provider_blocks
  FOR SELECT USING (true);
