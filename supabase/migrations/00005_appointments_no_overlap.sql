-- Prevent double-booking at the database level.
-- The application already does a check-then-insert, but that has a TOCTOU
-- race window under concurrent load. This exclusion constraint closes the
-- gap by having Postgres reject the INSERT atomically if an overlapping
-- active appointment already exists for the same provider.
--
-- btree_gist is required to mix uuid (=) and tstzrange (&&) in one EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING GIST (
    provider_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show', 'completed'));
