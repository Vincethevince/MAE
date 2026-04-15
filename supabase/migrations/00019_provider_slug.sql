-- Add slug column to providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index (allows NULL values to coexist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_slug ON providers (slug);

-- Auto-generate slugs for all existing providers
-- Slug rules: lowercase, ä→ae, ö→oe, ü→ue, ß→ss, spaces and special chars→-, deduplicate hyphens, trim, max 50 chars
-- For uniqueness: append -2, -3 etc if collision
DO $$
DECLARE
  r RECORD;
  base_slug text;
  candidate_slug text;
  counter int;
BEGIN
  FOR r IN SELECT id, business_name FROM providers WHERE slug IS NULL LOOP
    -- Basic slug from business_name
    base_slug := lower(r.business_name);
    base_slug := replace(base_slug, 'ä', 'ae');
    base_slug := replace(base_slug, 'ö', 'oe');
    base_slug := replace(base_slug, 'ü', 'ue');
    base_slug := replace(base_slug, 'ß', 'ss');
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 50);

    -- Ensure uniqueness
    candidate_slug := base_slug;
    counter := 2;
    WHILE EXISTS (SELECT 1 FROM providers WHERE slug = candidate_slug) LOOP
      candidate_slug := left(base_slug, 46) || '-' || counter::text;
      counter := counter + 1;
    END LOOP;

    UPDATE providers SET slug = candidate_slug WHERE id = r.id;
  END LOOP;
END $$;
