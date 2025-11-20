-- Izveido storage bucket galerijas bildēm
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- RLS politikas priekš gallery bucket
CREATE POLICY "Bildes ir publiski pieejamas"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Meistari var augšupielādēt savas bildes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Meistari var dzēst savas bildes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Meistari var atjaunināt savas bildes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);