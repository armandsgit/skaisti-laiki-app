-- Add is_cancelled field to professional_profiles table
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;

COMMENT ON COLUMN public.professional_profiles.is_cancelled IS 'Indicates if subscription is cancelled but still active until period end';