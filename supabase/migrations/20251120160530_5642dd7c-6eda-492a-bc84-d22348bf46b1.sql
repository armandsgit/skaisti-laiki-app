-- Add new fields to professional_profiles for sorting system
ALTER TABLE professional_profiles 
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free' CHECK (plan IN ('pro', 'basic', 'free')),
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_active timestamp with time zone DEFAULT now();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_professional_profiles_plan ON professional_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_active ON professional_profiles(active);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_last_active ON professional_profiles(last_active);

-- Update existing records to have default values
UPDATE professional_profiles 
SET plan = 'free', 
    active = true, 
    last_active = now()
WHERE plan IS NULL OR active IS NULL OR last_active IS NULL;