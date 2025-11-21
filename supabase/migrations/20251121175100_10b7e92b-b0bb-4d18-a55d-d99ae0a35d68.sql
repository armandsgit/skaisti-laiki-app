-- Drop old time_slot_interval check constraint
ALTER TABLE professional_schedules 
DROP CONSTRAINT IF EXISTS professional_schedules_time_slot_interval_check;

-- Update all existing schedules to use 10 minute interval
UPDATE professional_schedules 
SET time_slot_interval = 10 
WHERE time_slot_interval IS NOT NULL;

-- Add new check constraint that only allows 10 minutes
ALTER TABLE professional_schedules 
ADD CONSTRAINT professional_schedules_time_slot_interval_check 
CHECK (time_slot_interval = 10);

-- Update default value to 10 minutes
ALTER TABLE professional_schedules 
ALTER COLUMN time_slot_interval SET DEFAULT 10;