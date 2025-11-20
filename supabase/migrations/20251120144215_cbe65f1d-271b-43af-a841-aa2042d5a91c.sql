-- RLS politikas storage.objects tabulai gallery bucket'am

-- Atļaut lietotājiem augšupielādēt savus attēlus
CREATE POLICY "Users can upload own images to gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Atļaut lietotājiem atjaunināt savus attēlus
CREATE POLICY "Users can update own images in gallery"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Atļaut lietotājiem dzēst savus attēlus
CREATE POLICY "Users can delete own images from gallery"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Publisks piekļuve visiem attēliem (skatīšanai)
CREATE POLICY "Public access to view gallery images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery');