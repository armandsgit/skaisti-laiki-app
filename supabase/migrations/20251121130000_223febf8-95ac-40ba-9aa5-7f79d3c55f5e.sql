-- Add available_services array to professional_schedules
ALTER TABLE public.professional_schedules 
ADD COLUMN available_services UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.professional_schedules.available_services IS 'Array of service IDs that are available on this day';