/*
  Create a public storage bucket for insurance company logos.
  Logos were previously stored in the private `policy-files` bucket,
  which prevented them from being displayed via public URLs.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_read_company_logos" ON storage.objects;
CREATE POLICY "public_read_company_logos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_insert_company_logos" ON storage.objects;
CREATE POLICY "auth_insert_company_logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_update_company_logos" ON storage.objects;
CREATE POLICY "auth_update_company_logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos') WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_delete_company_logos" ON storage.objects;
CREATE POLICY "auth_delete_company_logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos');
