-- Set default duration for services that don't have one
UPDATE services
SET duration = 60
WHERE duration IS NULL OR duration = 0;

-- Make duration non-nullable with default
ALTER TABLE services
ALTER COLUMN duration SET DEFAULT 60;

ALTER TABLE services
ALTER COLUMN duration SET NOT NULL;

COMMENT ON COLUMN services.duration IS 'Service duration in minutes (15, 30, 45, 60, 90, 120, 180, 240)';