CREATE TABLE IF NOT EXISTS saved_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(customer_id, provider_id)
);

ALTER TABLE saved_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved providers"
  ON saved_providers FOR ALL
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Index for lookups by provider (e.g. cascade checks, admin queries)
CREATE INDEX IF NOT EXISTS idx_saved_providers_provider_id
  ON saved_providers (provider_id);
