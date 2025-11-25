-- Create schedule_exceptions table for managing special dates
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  time_ranges JSONB,
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(professional_id, exception_date, staff_member_id)
);

-- Enable RLS
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Policies for schedule_exceptions
CREATE POLICY "Professionals can manage own schedule exceptions"
ON public.schedule_exceptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.professional_profiles
    WHERE professional_profiles.id = schedule_exceptions.professional_id
    AND professional_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view schedule exceptions"
ON public.schedule_exceptions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all schedule exceptions"
ON public.schedule_exceptions
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_schedule_exceptions_updated_at
BEFORE UPDATE ON public.schedule_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_schedule_exceptions_date ON public.schedule_exceptions(professional_id, exception_date);