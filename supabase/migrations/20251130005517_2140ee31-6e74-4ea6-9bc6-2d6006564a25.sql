-- Add approved column to profiles table for client approval workflow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Update existing clients to be approved by default (backward compatibility)
UPDATE public.profiles SET approved = true WHERE role = 'CLIENT' AND approved IS NULL;

-- Create index for faster queries on approved status
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);

-- Update RLS policies to check approved status for clients
-- Drop existing client view policy if it exists
DROP POLICY IF EXISTS "Clients can view professional profiles" ON public.profiles;

-- Recreate with approved check
CREATE POLICY "Approved clients can view professional profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM professional_profiles pp
    WHERE pp.user_id = profiles.id 
      AND pp.approved = true 
      AND COALESCE(pp.is_blocked, false) = false
  )
);

-- Add policy for admins to view all profiles including unapproved
-- This policy already exists but ensure it covers unapproved clients
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'));

-- Update user view own profile policy to allow unapproved users to see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);