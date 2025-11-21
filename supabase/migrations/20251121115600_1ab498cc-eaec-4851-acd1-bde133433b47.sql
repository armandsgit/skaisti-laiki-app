-- Create table for professional work schedules
CREATE TABLE public.professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(professional_id, day_of_week, start_time)
);

-- Enable RLS
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active schedules"
  ON public.professional_schedules
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Professionals can manage own schedules"
  ON public.professional_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE id = professional_schedules.professional_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all schedules"
  ON public.professional_schedules
  FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

-- Create table for blocked time slots (holidays, breaks, etc.)
CREATE TABLE public.blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view blocked slots"
  ON public.blocked_time_slots
  FOR SELECT
  USING (true);

CREATE POLICY "Professionals can manage own blocked slots"
  ON public.blocked_time_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE id = blocked_time_slots.professional_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all blocked slots"
  ON public.blocked_time_slots
  FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

-- Add updated_at trigger
CREATE TRIGGER update_professional_schedules_updated_at
  BEFORE UPDATE ON public.professional_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocked_time_slots_updated_at
  BEFORE UPDATE ON public.blocked_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();