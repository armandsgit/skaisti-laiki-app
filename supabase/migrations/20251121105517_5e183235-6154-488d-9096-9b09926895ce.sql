-- Add status and updated_at columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add check constraint for status
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_status_check;

ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop the old "Anyone can view reviews" policy
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

-- Create new policy: Only approved reviews are publicly visible
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews
  FOR SELECT
  USING (status = 'approved');

-- Policy: Admins can update reviews
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;

CREATE POLICY "Admins can update reviews"
  ON public.reviews
  FOR UPDATE
  USING (has_role(auth.uid(), 'ADMIN'::user_role))
  WITH CHECK (has_role(auth.uid(), 'ADMIN'::user_role));

-- Policy: Clients can view their own reviews (any status)
DROP POLICY IF EXISTS "Clients can view own reviews" ON public.reviews;

CREATE POLICY "Clients can view own reviews"
  ON public.reviews
  FOR SELECT
  USING (auth.uid() = client_id);