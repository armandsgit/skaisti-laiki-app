-- Add auto-completion tracking fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS auto_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Create booking_events audit table for tracking booking lifecycle events
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking_events
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all booking events
CREATE POLICY "Admins can view all booking events" 
ON public.booking_events 
FOR SELECT 
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Professionals can view their booking events
CREATE POLICY "Professionals can view their booking events" 
ON public.booking_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.professional_profiles pp ON pp.id = b.professional_id
    WHERE b.id = booking_events.booking_id 
    AND pp.user_id = auth.uid()
  )
);

-- Clients can view their booking events
CREATE POLICY "Clients can view their booking events" 
ON public.booking_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_events.booking_id 
    AND b.client_id = auth.uid()
  )
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_auto_complete ON public.bookings(status, booking_date, booking_end_time) 
WHERE status = 'confirmed' AND auto_completed_at IS NULL;

COMMENT ON COLUMN public.bookings.auto_completed_at IS 'Timestamp when booking was automatically marked as completed';
COMMENT ON COLUMN public.bookings.completed_by IS 'Who completed the booking: "auto" for automatic completion, user_id for manual completion';
COMMENT ON TABLE public.booking_events IS 'Audit log for booking lifecycle events';