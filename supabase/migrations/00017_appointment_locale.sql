-- Store the customer's UI locale at booking time so reminder/review emails
-- can be sent in the correct language.
-- Default: 'de' for all existing rows and new rows where locale is not specified.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'de'
  CHECK (locale IN ('de', 'en'));

COMMENT ON COLUMN appointments.locale IS
  'UI locale the customer was using when they made the booking (de|en). Used to send localized email notifications.';
