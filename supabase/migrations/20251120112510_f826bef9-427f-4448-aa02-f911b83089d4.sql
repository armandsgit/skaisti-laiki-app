-- Fix the RLS policy that's causing the error
DROP POLICY IF EXISTS "Professionals can update own profile" ON professional_profiles;

CREATE POLICY "Professionals can update own profile"
ON professional_profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND approved = (SELECT approved FROM professional_profiles WHERE id = professional_profiles.id)
  AND is_verified = (SELECT is_verified FROM professional_profiles WHERE id = professional_profiles.id)
);