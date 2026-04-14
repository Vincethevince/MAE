-- Allow providers to read the full profile row (including phone) of customers
-- who have at least one appointment with their business.
-- Without this, providers can only see full_name via the public_profiles view.
CREATE POLICY "Providers can read customer profiles for their appointments"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN providers p ON p.id = a.provider_id
      WHERE a.user_id = profiles.id
        AND p.profile_id = auth.uid()
    )
  );
