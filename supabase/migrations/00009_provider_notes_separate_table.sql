-- Migration: move provider_notes off the appointments row into its own table
-- Reason: the existing customer SELECT policy on appointments returns the entire row,
-- which would expose internal provider notes to customers. A separate table with
-- its own RLS policy (provider_id = auth.uid()) prevents that leakage.

-- 1. Create the new table
CREATE TABLE IF NOT EXISTS appointment_provider_notes (
  appointment_id UUID PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  note           TEXT NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Migrate existing non-null notes
INSERT INTO appointment_provider_notes (appointment_id, provider_id, note)
SELECT id, provider_id, provider_notes
FROM appointments
WHERE provider_notes IS NOT NULL AND provider_notes <> '';

-- 3. Enable RLS — only the owning provider can read or write
ALTER TABLE appointment_provider_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can manage own appointment notes"
  ON appointment_provider_notes
  FOR ALL
  USING (
    provider_id = (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id = (
      SELECT id FROM providers WHERE profile_id = auth.uid()
    )
  );

-- 4. Drop the column from appointments so customers never see it
ALTER TABLE appointments DROP COLUMN IF EXISTS provider_notes;
