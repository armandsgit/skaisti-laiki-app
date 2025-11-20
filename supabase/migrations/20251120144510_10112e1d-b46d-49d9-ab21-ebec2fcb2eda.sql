-- Atļaut klientiem skatīt meistaru profilus (vārdus, avatārus)
CREATE POLICY "Clients can view professional profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM professional_profiles pp
    WHERE pp.user_id = profiles.id
    AND pp.approved = true
    AND COALESCE(pp.is_blocked, false) = false
  )
);