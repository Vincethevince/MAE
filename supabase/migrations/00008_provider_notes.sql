-- Add provider_notes column to appointments for internal provider use.
-- Only the provider owning the appointment can read/write this field.
ALTER TABLE appointments ADD COLUMN provider_notes TEXT DEFAULT NULL;
