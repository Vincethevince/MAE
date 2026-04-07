ALTER TABLE appointments ADD COLUMN reminder_24h_sent_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_appointments_reminder ON appointments (start_time, status, reminder_24h_sent_at) WHERE status IN ('pending', 'confirmed');
