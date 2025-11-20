-- Add status column to profiles table for client suspension
ALTER TABLE public.profiles 
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Add comment
COMMENT ON COLUMN public.profiles.status IS 'Account status: active or suspended';
