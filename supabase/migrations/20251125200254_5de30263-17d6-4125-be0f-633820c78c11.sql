-- Expand booking_status enum to include all cancellation types
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_master';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_client';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_system';

-- Add cancellation tracking fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Create index for efficient cancellation queries
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON bookings(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);

-- Add comments for documentation
COMMENT ON COLUMN bookings.cancelled_by IS 'User ID who cancelled the booking (client, professional, or system)';
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when booking was cancelled';
COMMENT ON COLUMN bookings.cancellation_reason IS 'Optional reason for cancellation';