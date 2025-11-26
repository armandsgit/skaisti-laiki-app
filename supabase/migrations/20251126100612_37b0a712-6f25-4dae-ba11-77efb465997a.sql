-- Add subscription_will_renew field to track auto-renewal status
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS subscription_will_renew boolean DEFAULT true;

-- Update existing records: active subscriptions should default to true
UPDATE public.professional_profiles
SET subscription_will_renew = true
WHERE subscription_status = 'active' AND plan != 'free';

-- Canceled subscriptions should default to false
UPDATE public.professional_profiles
SET subscription_will_renew = false
WHERE is_cancelled = true OR subscription_status = 'canceled';