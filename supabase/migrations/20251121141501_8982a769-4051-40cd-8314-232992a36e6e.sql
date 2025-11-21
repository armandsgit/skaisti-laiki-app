-- Create master_services junction table for many-to-many relationship
CREATE TABLE public.master_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(staff_member_id, service_id)
);

-- Enable RLS
ALTER TABLE public.master_services ENABLE ROW LEVEL SECURITY;

-- Anyone can view master-service relationships
CREATE POLICY "Anyone can view master services"
  ON public.master_services
  FOR SELECT
  USING (true);

-- Professionals can manage their own master services
CREATE POLICY "Professionals can manage own master services"
  ON public.master_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      JOIN public.professional_profiles pp ON pp.id = sm.professional_id
      WHERE sm.id = master_services.staff_member_id
        AND pp.user_id = auth.uid()
    )
  );

-- Admins can manage all master services
CREATE POLICY "Admins can manage all master services"
  ON public.master_services
  FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

-- Create index for faster lookups
CREATE INDEX idx_master_services_staff_member ON public.master_services(staff_member_id);
CREATE INDEX idx_master_services_service ON public.master_services(service_id);

-- Migrate existing data from services.staff_member_id to master_services
INSERT INTO public.master_services (staff_member_id, service_id)
SELECT staff_member_id, id
FROM public.services
WHERE staff_member_id IS NOT NULL
ON CONFLICT (staff_member_id, service_id) DO NOTHING;