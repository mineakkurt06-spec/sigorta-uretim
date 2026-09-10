/*
# Insurance Agency Management System - Full Schema

## Overview
Complete schema for a multi-agency insurance management SaaS with authentication.
The signed-in user (agency owner) manages multiple agencies, customers, policies,
damage records, accounting, staff, and reminders.

## New Tables

1. **agencies** — Insurance agencies the user manages (e.g. Sigortalia, BIC Sigorta, etc.)
2. **customers** — Customer records
3. **policies** — Insurance policies (production records) with net/brut prim, verecek/verdi
4. **damage_records** — Vehicle damage records
5. **staff** — Agency personnel
6. **accounting_entries** — Accounting entries (cari durum / tahsilat-odeme)
7. **reminders** — Calendar reminders

## Security
- RLS enabled on every table.
- All tables are owner-scoped via user_id = auth.uid().
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), TO authenticated, ownership check.
- user_id columns default to auth.uid() so inserts without explicit user_id succeed.
*/

-- ===================== AGENCIES =====================
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_agencies" ON agencies;
CREATE POLICY "select_own_agencies" ON agencies FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_agencies" ON agencies;
CREATE POLICY "insert_own_agencies" ON agencies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_agencies" ON agencies;
CREATE POLICY "update_own_agencies" ON agencies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_agencies" ON agencies;
CREATE POLICY "delete_own_agencies" ON agencies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== CUSTOMERS =====================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tc_vergi_no text,
  ad_soyad_unvan text NOT NULL,
  referans text,
  telefon text,
  eposta text,
  dogum_tarihi date,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== POLICIES (PRODUCTION) =====================
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigorta_sirketi text NOT NULL,
  musteri_adi text NOT NULL,
  police_no text,
  net_prim numeric(14,2) DEFAULT 0,
  brut_prim numeric(14,2) DEFAULT 0,
  urun text,
  baslangic_tarihi date,
  bitis_tarihi date,
  tanzim_tarihi date DEFAULT now()::date,
  sigorta_turu text,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  personel_adi text,
  uretim_tipi text DEFAULT 'ic',
  odeme_durumu text DEFAULT 'verecek',
  iptal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_policies" ON policies;
CREATE POLICY "select_own_policies" ON policies FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_policies" ON policies;
CREATE POLICY "insert_own_policies" ON policies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_policies" ON policies;
CREATE POLICY "update_own_policies" ON policies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_policies" ON policies;
CREATE POLICY "delete_own_policies" ON policies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== DAMAGE RECORDS =====================
CREATE TABLE IF NOT EXISTS damage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  musteri_adi text NOT NULL,
  police_no text,
  arac_plaka text,
  hasar_tarihi date,
  hasar_tutar numeric(14,2) DEFAULT 0,
  aciklama text,
  durum text DEFAULT 'Açık',
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE damage_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_damage" ON damage_records;
CREATE POLICY "select_own_damage" ON damage_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_damage" ON damage_records;
CREATE POLICY "insert_own_damage" ON damage_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_damage" ON damage_records;
CREATE POLICY "update_own_damage" ON damage_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_damage" ON damage_records;
CREATE POLICY "delete_own_damage" ON damage_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== STAFF =====================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_soyad text NOT NULL,
  gorevi text,
  telefon text,
  eposta text,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
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

-- ===================== ACCOUNTING ENTRIES =====================
CREATE TABLE IF NOT EXISTS accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip text NOT NULL,
  aciklama text,
  tutar numeric(14,2) DEFAULT 0,
  tarih date,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_accounting" ON accounting_entries;
CREATE POLICY "select_own_accounting" ON accounting_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_accounting" ON accounting_entries;
CREATE POLICY "insert_own_accounting" ON accounting_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_accounting" ON accounting_entries;
CREATE POLICY "update_own_accounting" ON accounting_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_accounting" ON accounting_entries;
CREATE POLICY "delete_own_accounting" ON accounting_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== REMINDERS =====================
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baslik text NOT NULL,
  aciklama text,
  tarih date NOT NULL,
  durum text DEFAULT 'Bekliyor',
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_reminders" ON reminders;
CREATE POLICY "select_own_reminders" ON reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reminders" ON reminders;
CREATE POLICY "insert_own_reminders" ON reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reminders" ON reminders;
CREATE POLICY "update_own_reminders" ON reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reminders" ON reminders;
CREATE POLICY "delete_own_reminders" ON reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_agency_id ON policies(agency_id);
CREATE INDEX IF NOT EXISTS idx_policies_bitis_tarihi ON policies(bitis_tarihi);
CREATE INDEX IF NOT EXISTS idx_policies_baslangic_tarihi ON policies(baslangic_tarihi);
CREATE INDEX IF NOT EXISTS idx_policies_tanzim_tarihi ON policies(tanzim_tarihi);
CREATE INDEX IF NOT EXISTS idx_policies_odeme_durumu ON policies(odeme_durumu);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_damage_user_id ON damage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_user_id ON accounting_entries(user_id);