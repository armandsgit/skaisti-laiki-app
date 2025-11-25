-- Add auto_cancelled_by_exception field to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS auto_cancelled_by_exception BOOLEAN DEFAULT false;

-- Add subscription_expires_at to professional_profiles if not exists
ALTER TABLE professional_profiles
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient expiration checks
CREATE INDEX IF NOT EXISTS idx_professional_profiles_subscription_expires_at
ON professional_profiles(subscription_expires_at)
WHERE subscription_expires_at IS NOT NULL;

COMMENT ON COLUMN bookings.auto_cancelled_by_exception IS 'Indicates if booking was automatically cancelled due to schedule exception (closed day)';
COMMENT ON COLUMN professional_profiles.subscription_expires_at IS 'Timestamp when subscription expires - used for automatic downgrade to free plan';