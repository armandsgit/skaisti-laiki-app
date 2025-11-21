-- Drop the old unique constraint that doesn't include staff_member_id
ALTER TABLE professional_schedules 
DROP CONSTRAINT IF EXISTS professional_schedules_professional_id_day_of_week_start_ti_key;

-- Add a new unique constraint that includes staff_member_id
-- This allows the same time slots for different staff members
ALTER TABLE professional_schedules
ADD CONSTRAINT professional_schedules_unique_slot
UNIQUE (professional_id, staff_member_id, day_of_week, start_time, end_time);