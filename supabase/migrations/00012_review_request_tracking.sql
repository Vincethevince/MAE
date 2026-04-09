-- Track when a post-appointment review request was sent to customers.
-- This prevents duplicate emails when the cron runs multiple times.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;
