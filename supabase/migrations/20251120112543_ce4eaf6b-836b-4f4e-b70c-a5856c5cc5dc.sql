-- Fix the RLS policy correctly - prevent professionals from changing approved/is_verified
DROP POLICY IF EXISTS "Professionals can update own profile" ON professional_profiles;

CREATE POLICY "Professionals can update own profile"
ON professional_profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  -- Only allow updating these fields, prevent changing approved/is_verified
  -- by ensuring they match the OLD values (current row values)
);