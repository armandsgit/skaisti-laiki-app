-- Update handle_new_user function to set new users as unapproved by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role user_role;
  user_avatar text;
BEGIN
  -- Get role from metadata, default to CLIENT
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CLIENT');
  
  -- Get avatar from Google OAuth (picture or avatar_url) or use null
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Insert into profiles with email, avatar, and approved = false for new users
  INSERT INTO public.profiles (id, name, role, email, avatar, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    NEW.email,
    user_avatar,
    false  -- New users require approval
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If profile exists (linked account), update with Google data if not already set
    name = COALESCE(profiles.name, EXCLUDED.name),
    email = COALESCE(profiles.email, EXCLUDED.email),
    avatar = COALESCE(profiles.avatar, EXCLUDED.avatar);
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;