-- Add subscription_status to professional_profiles
ALTER TABLE public.professional_profiles 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive'));

-- Update existing professionals with active status if they have a plan
UPDATE public.professional_profiles 
SET subscription_status = 'active' 
WHERE plan IS NOT NULL AND plan != 'free';

-- Add index for subscription_status
CREATE INDEX IF NOT EXISTS idx_professional_profiles_subscription_status 
ON public.professional_profiles(subscription_status);

-- Update plan column to ensure it has proper check constraint
ALTER TABLE public.professional_profiles 
DROP CONSTRAINT IF EXISTS professional_profiles_plan_check;

ALTER TABLE public.professional_profiles 
ADD CONSTRAINT professional_profiles_plan_check 
CHECK (plan IN ('free', 'basic', 'pro', 'starter', 'premium'));

COMMENT ON COLUMN public.professional_profiles.subscription_status IS 'Subscription status: active or inactive. Controls master visibility.';
COMMENT ON COLUMN public.professional_profiles.plan IS 'Subscription plan: starter (free), pro, or premium';