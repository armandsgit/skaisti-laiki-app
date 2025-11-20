-- Add subscription_last_changed field to professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS subscription_last_changed timestamp with time zone DEFAULT now();

COMMENT ON COLUMN public.professional_profiles.subscription_last_changed IS 'Timestamp when the subscription plan or status was last changed';