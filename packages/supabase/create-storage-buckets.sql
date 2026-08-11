-- Create storage buckets for ControlHogar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('maintenance-photos', 'maintenance-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('receipts', 'receipts', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: maintenance-photos (public read, authenticated upload)
CREATE POLICY "Public read maintenance photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated upload maintenance photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'maintenance-photos' AND auth.role() = 'authenticated');

-- Storage policies: receipts (only owner can read/write)
CREATE POLICY "Authenticated access receipts"
  ON storage.objects FOR ALL
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Storage policies: avatars (public read, owner upload)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
