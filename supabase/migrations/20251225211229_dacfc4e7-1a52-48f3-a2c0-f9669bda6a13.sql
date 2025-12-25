-- Add booking_window_days column to professional_profiles
-- This controls how far in advance clients can book appointments
-- Options: 7 (1 week), 14 (2 weeks), 21 (3 weeks), 31 (1 month)
ALTER TABLE public.professional_profiles 
ADD COLUMN IF NOT EXISTS booking_window_days integer DEFAULT 31;

-- Add comment to explain the column
COMMENT ON COLUMN public.professional_profiles.booking_window_days IS 'Number of days in advance clients can book: 7, 14, 21, or 31';