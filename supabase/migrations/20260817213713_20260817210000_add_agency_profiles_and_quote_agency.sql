/*
# Acente Profil Ayarları ve Tekliflere Acente Ekleme

## Yeni Tablolar
1. agency_profiles - Acente/şube bilgileri (name, phone, email, address, logo_url)
   - Her kullanıcı için tek bir acente profili tutulur

## Modifiye Tablolar
- quotes: + agency_id (acente seçimi için)

## Güvenlik
- agency_profiles: authenticated-only, kullanıcı sahipliği
- quotes agency_id opsiyonel
*/

CREATE TABLE IF NOT EXISTS agency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text,
  email text,
  address text,
  logo_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agency_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agency_profile" ON agency_profiles;
CREATE POLICY "select_own_agency_profile" ON agency_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_agency_profile" ON agency_profiles;
CREATE POLICY "insert_own_agency_profile" ON agency_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_agency_profile" ON agency_profiles;
CREATE POLICY "update_own_agency_profile" ON agency_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_agency_profile" ON agency_profiles;
CREATE POLICY "delete_own_agency_profile" ON agency_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add agency_id to quotes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'agency_id') THEN
    ALTER TABLE quotes ADD COLUMN agency_id uuid;
  END IF;
END $$;
