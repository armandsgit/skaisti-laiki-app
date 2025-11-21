-- Add booking end time to track full duration of bookings
ALTER TABLE bookings
ADD COLUMN booking_end_time time without time zone;

-- Update existing bookings to calculate end time based on service duration
UPDATE bookings
SET booking_end_time = (booking_time::time + (
  SELECT (duration || ' minutes')::interval 
  FROM services 
  WHERE services.id = bookings.service_id
))::time
WHERE booking_end_time IS NULL;

-- Make booking_end_time required for future bookings
ALTER TABLE bookings
ALTER COLUMN booking_end_time SET NOT NULL;

COMMENT ON COLUMN bookings.booking_end_time IS 'End time of the booking, calculated from booking_time + service duration';