-- Enable realtime for professional_profiles table
ALTER TABLE public.professional_profiles REPLICA IDENTITY FULL;

-- Add professional_profiles to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_profiles;