-- First, drop the old constraint
ALTER TABLE public.professional_profiles 
DROP CONSTRAINT IF EXISTS professional_profiles_plan_check;

-- Now we can safely update plan values
UPDATE public.professional_profiles 
SET plan = 'starteris' 
WHERE plan = 'starter';

UPDATE public.professional_profiles 
SET plan = 'bizness' 
WHERE plan = 'premium';

-- Finally, add the correct constraint
ALTER TABLE public.professional_profiles 
ADD CONSTRAINT professional_profiles_plan_check 
CHECK (plan IN ('free', 'starteris', 'pro', 'bizness'));