-- Create categories table for dynamic category management
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text DEFAULT '✨',
  color text DEFAULT '#ec4899',
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::user_role))
WITH CHECK (has_role(auth.uid(), 'ADMIN'::user_role));

-- Insert default categories
INSERT INTO public.categories (name, icon, color, display_order) VALUES
  ('Frizieris', '💇', '#3b82f6', 1),
  ('Manikīrs', '💅', '#ec4899', 2),
  ('Pedikīrs', '🦶', '#8b5cf6', 3),
  ('Skropstas', '👁️', '#a855f7', 4),
  ('Masāža', '💆', '#10b981', 5),
  ('Kosmetoloģija', '✨', '#f59e0b', 6)
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Note: We keep the service_category enum for backward compatibility
-- Professional profiles will still use the enum, but we'll sync it with the categories table
-- In the future, we can migrate to use category_id foreign key instead