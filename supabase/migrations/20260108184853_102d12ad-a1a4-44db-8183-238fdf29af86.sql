-- Create favorites table for clients to save their favorite professionals
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a client can only favorite a professional once
  UNIQUE(client_id, professional_id)
);

-- Enable Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Clients can view their own favorites
CREATE POLICY "Clients can view own favorites" 
ON public.favorites 
FOR SELECT 
USING (auth.uid() = client_id);

-- Clients can add favorites
CREATE POLICY "Clients can add favorites" 
ON public.favorites 
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

-- Clients can remove their favorites
CREATE POLICY "Clients can remove own favorites" 
ON public.favorites 
FOR DELETE 
USING (auth.uid() = client_id);

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites"
ON public.favorites
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- Create index for faster queries
CREATE INDEX idx_favorites_client_id ON public.favorites(client_id);
CREATE INDEX idx_favorites_professional_id ON public.favorites(professional_id);