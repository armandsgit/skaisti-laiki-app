-- Create a function to automatically create a staff member for new professional profiles
CREATE OR REPLACE FUNCTION public.create_default_staff_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a staff member for the professional using their profile data
  INSERT INTO public.staff_members (
    professional_id,
    name,
    position,
    avatar,
    is_active,
    show_on_profile,
    created_at
  )
  SELECT
    NEW.id,
    p.name,
    'Īpašnieks',
    p.avatar,
    true,
    true,
    NOW()
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create staff member on professional profile creation
DROP TRIGGER IF EXISTS trigger_create_default_staff_member ON public.professional_profiles;
CREATE TRIGGER trigger_create_default_staff_member
  AFTER INSERT ON public.professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_staff_member();

-- For existing professional profiles without staff members, create them
INSERT INTO public.staff_members (professional_id, name, position, avatar, is_active, show_on_profile)
SELECT 
  pp.id as professional_id,
  p.name,
  'Īpašnieks' as position,
  p.avatar,
  true as is_active,
  true as show_on_profile
FROM public.professional_profiles pp
JOIN public.profiles p ON p.id = pp.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_members sm 
  WHERE sm.professional_id = pp.id 
  AND sm.position = 'Īpašnieks'
);