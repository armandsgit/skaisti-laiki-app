-- Add DELETE policy for professionals to manage their own bookings
CREATE POLICY "Professionals can delete their bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM professional_profiles
    WHERE professional_profiles.id = bookings.professional_id
    AND professional_profiles.user_id = auth.uid()
  )
);