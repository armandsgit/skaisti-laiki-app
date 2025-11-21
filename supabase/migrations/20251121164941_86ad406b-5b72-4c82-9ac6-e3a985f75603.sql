-- Add visibility control for staff members on public profile
ALTER TABLE public.staff_members 
ADD COLUMN show_on_profile BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.staff_members.show_on_profile IS 'Controls whether this staff member is visible on the public professional profile page';