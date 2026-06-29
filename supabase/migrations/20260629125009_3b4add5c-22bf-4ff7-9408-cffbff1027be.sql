
CREATE POLICY "Public read far-images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'far-images');
CREATE POLICY "Public insert far-images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'far-images');
CREATE POLICY "Public update far-images" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'far-images') WITH CHECK (bucket_id = 'far-images');
CREATE POLICY "Public delete far-images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'far-images');
