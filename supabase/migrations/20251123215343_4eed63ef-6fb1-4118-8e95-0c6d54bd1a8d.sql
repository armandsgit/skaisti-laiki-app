-- Create email_credits table
CREATE TABLE public.email_credits (
  master_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (master_id)
);

-- Create email_usage table
CREATE TABLE public.email_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('reservation', 'reminder')),
  recipient text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email_packages table
CREATE TABLE public.email_packages (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price numeric NOT NULL
);

-- Insert initial email packages
INSERT INTO public.email_packages (id, name, credits, price) VALUES
  ('1', 'Mazais', 100, 5.00),
  ('2', 'Videjais', 500, 20.00),
  ('3', 'Lielais', 2000, 60.00);

-- Enable RLS
ALTER TABLE public.email_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_credits
CREATE POLICY "Professionals can view own credits"
ON public.email_credits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.professional_profiles
    WHERE id = email_credits.master_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all credits"
ON public.email_credits FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- RLS Policies for email_usage
CREATE POLICY "Professionals can view own usage"
ON public.email_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.professional_profiles
    WHERE id = email_usage.master_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all usage"
ON public.email_usage FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'::user_role));

-- RLS Policies for email_packages
CREATE POLICY "Anyone can view packages"
ON public.email_packages FOR SELECT
USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_email_credits_updated_at
  BEFORE UPDATE ON public.email_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();