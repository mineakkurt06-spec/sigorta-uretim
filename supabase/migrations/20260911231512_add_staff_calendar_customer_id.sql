/*
# Add staff, calendar_entries tables and customer_id on policies

1. New Tables
- `staff`: Personel kayıtları için. user_id (auth.uid), ad_soyad, gorevi, telefon, eposta, bagli_acente
- `calendar_entries`: Takvim/hatırlatma kayıtları için. user_id, tarih, baslik, aciklama, durum
2. Modified Tables
- `policies`: Add nullable `customer_id` column (uuid, references customers(id)) to link policies to real customer records
3. Security
- Enable RLS on staff and calendar_entries
- Owner-scoped CRUD policies (authenticated only, auth.uid() = user_id)
*/

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_soyad text NOT NULL DEFAULT '',
  gorevi text NOT NULL DEFAULT '',
  telefon text NOT NULL DEFAULT '',
  eposta text NOT NULL DEFAULT '',
  bagli_acente text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_staff" ON staff;
CREATE POLICY "select_own_staff" ON staff FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_staff" ON staff;
CREATE POLICY "insert_own_staff" ON staff FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_staff" ON staff;
CREATE POLICY "update_own_staff" ON staff FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_staff" ON staff;
CREATE POLICY "delete_own_staff" ON staff FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tarih text NOT NULL DEFAULT '',
  baslik text NOT NULL DEFAULT '',
  aciklama text NOT NULL DEFAULT '',
  durum text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_calendar" ON calendar_entries;
CREATE POLICY "select_own_calendar" ON calendar_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_calendar" ON calendar_entries;
CREATE POLICY "insert_own_calendar" ON calendar_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_calendar" ON calendar_entries;
CREATE POLICY "update_own_calendar" ON calendar_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_calendar" ON calendar_entries;
CREATE POLICY "delete_own_calendar" ON calendar_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policies' AND column_name = 'customer_id') THEN
    ALTER TABLE policies ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;
