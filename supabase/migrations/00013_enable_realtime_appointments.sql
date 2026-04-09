-- Enable Supabase Realtime for the appointments table so providers
-- receive live notifications when new bookings arrive.
-- Realtime respects RLS: a browser client (anon key + user session)
-- can only receive events it is allowed to SELECT.
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
