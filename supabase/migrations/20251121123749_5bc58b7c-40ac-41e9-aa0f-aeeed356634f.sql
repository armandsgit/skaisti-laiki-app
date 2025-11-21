-- Add time slot interval to professional schedules
ALTER TABLE professional_schedules
ADD COLUMN time_slot_interval integer DEFAULT 30 CHECK (time_slot_interval IN (15, 30, 60));

COMMENT ON COLUMN professional_schedules.time_slot_interval IS 'Time slot interval in minutes: 15, 30, or 60';