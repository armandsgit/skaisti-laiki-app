-- Add location and approval fields to professional_profiles
ALTER TABLE professional_profiles 
ADD COLUMN address TEXT,
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC,
ADD COLUMN approved BOOLEAN DEFAULT false;

-- Create index for location-based queries
CREATE INDEX idx_professional_profiles_approved ON professional_profiles(approved);
CREATE INDEX idx_professional_profiles_location ON professional_profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Update existing professionals to be approved by default (for backwards compatibility)
UPDATE professional_profiles SET approved = true WHERE approved IS NULL;