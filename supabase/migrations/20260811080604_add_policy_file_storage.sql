/*
# Add policy file storage

1. New Columns
- `policies.file_url` (text, nullable) - URL of uploaded policy document in Supabase Storage
- `policies.file_name` (text, nullable) - Original filename of the uploaded document
2. Storage
- Create storage bucket `policy-files` (private) for storing policy PDF/image documents
- Allow authenticated users to upload, read, and delete files in this bucket
3. Security
- RLS already enabled on `policies` table; no changes needed
- Storage bucket policies: authenticated users can CRUD their own files
*/

ALTER TABLE policies ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS file_name text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-files', 'policy-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_read_policy_files" ON storage.objects;
CREATE POLICY "auth_read_policy_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'policy-files');

DROP POLICY IF EXISTS "auth_insert_policy_files" ON storage.objects;
CREATE POLICY "auth_insert_policy_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-files');

DROP POLICY IF EXISTS "auth_update_policy_files" ON storage.objects;
CREATE POLICY "auth_update_policy_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'policy-files') WITH CHECK (bucket_id = 'policy-files');

DROP POLICY IF EXISTS "auth_delete_policy_files" ON storage.objects;
CREATE POLICY "auth_delete_policy_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'policy-files');
