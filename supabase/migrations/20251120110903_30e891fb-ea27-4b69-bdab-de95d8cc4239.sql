-- Add is_blocked field to professional_profiles
ALTER TABLE public.professional_profiles 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Update RLS policy to prevent blocked professionals from being visible to clients
DROP POLICY IF EXISTS "Anyone can view professional profiles" ON public.professional_profiles;

CREATE POLICY "Anyone can view non-blocked professional profiles" 
ON public.professional_profiles 
FOR SELECT 
USING (
  NOT COALESCE(is_blocked, false) OR 
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'ADMIN'::user_role)
);