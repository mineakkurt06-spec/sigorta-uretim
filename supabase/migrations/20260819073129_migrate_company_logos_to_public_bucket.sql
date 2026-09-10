/*
  Copy existing company logos from the private `policy-files` bucket
  to the new public `company-logos` bucket so they can be displayed via public URLs.
*/
DO $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT name FROM storage.objects WHERE bucket_id = 'policy-files' AND name LIKE 'company-logos/%'
  LOOP
    INSERT INTO storage.objects (name, bucket_id, owner, metadata)
    SELECT obj.name, 'company-logos', owner, metadata
    FROM storage.objects
    WHERE bucket_id = 'policy-files' AND name = obj.name
    ON CONFLICT (bucket_id, name) DO NOTHING;
  END LOOP;
END $$;
