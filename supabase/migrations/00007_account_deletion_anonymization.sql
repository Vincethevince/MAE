-- Allow user_id to be NULL on appointments and reviews (for anonymization on account deletion)
-- This preserves provider business records while removing personal data

ALTER TABLE appointments DROP CONSTRAINT appointments_user_id_fkey;
ALTER TABLE appointments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE appointments ADD CONSTRAINT appointments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT reviews_user_id_fkey;
ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
