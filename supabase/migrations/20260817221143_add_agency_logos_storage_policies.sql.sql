-- Storage policies for agency-logos bucket (authenticated users can manage logos)
DROP POLICY IF EXISTS "auth_read_agency_logos" ON storage.objects;
CREATE POLICY "auth_read_agency_logos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "auth_insert_agency_logos" ON storage.objects;
CREATE POLICY "auth_insert_agency_logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "auth_update_agency_logos" ON storage.objects;
CREATE POLICY "auth_update_agency_logos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'agency-logos') WITH CHECK (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "auth_delete_agency_logos" ON storage.objects;
CREATE POLICY "auth_delete_agency_logos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'agency-logos');
