-- Create staff_members table for multi-master support
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on staff_members
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_members
CREATE POLICY "Anyone can view active staff members"
  ON public.staff_members
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Professionals can manage own staff"
  ON public.staff_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = staff_members.professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all staff"
  ON public.staff_members
  FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Add staff_member_id to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE;

-- Add staff_member_id to professional_schedules table
ALTER TABLE public.professional_schedules
ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE;

-- Add staff_member_id to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();