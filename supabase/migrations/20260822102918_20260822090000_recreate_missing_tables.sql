-- Recreate all data tables that were lost when the database was reset.
-- This merges the base schema (20260810142451, 20260810145335) with all
-- subsequent ALTER TABLE additions into the final state.

-- ===================== AGENCIES =====================
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commission_rate numeric(5,2) DEFAULT 0,
  is_external boolean NOT NULL DEFAULT false,
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
  ruhsat_belge_no text,
  plaka_no text,
  motor_no text,
  sase_no text,
  notes text DEFAULT '',
  marka_kodu text,
  model_kodu text,
  arac_yili text,
  arac_markasi text,
  arac_modeli text,
  arac_kodu text,
  arac_tipi text,
  uavt_adres_kodu text,
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

-- Unique partial indexes for customers
CREATE UNIQUE INDEX IF NOT EXISTS customers_uavt_adres_kodu_unique
  ON customers(uavt_adres_kodu)
  WHERE uavt_adres_kodu IS NOT NULL AND uavt_adres_kodu != '';
CREATE UNIQUE INDEX IF NOT EXISTS customers_plaka_no_unique
  ON customers(UPPER(TRIM(plaka_no)))
  WHERE plaka_no IS NOT NULL AND plaka_no != '';

-- ===================== POLICIES =====================
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
  sigorta_toru text,
  sigorta_turu text,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  personel_adi text,
  uretim_tipi text DEFAULT 'ic',
  odeme_durumu text DEFAULT 'verecek',
  iptal boolean DEFAULT false,
  aciklama text,
  file_url text,
  file_name text,
  payment_method text DEFAULT 'Nakit',
  record_type text DEFAULT 'uretim',
  bank_account_id uuid,
  branch_group text,
  issuing_agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  plaka text,
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

CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_agency_id ON policies(agency_id);
CREATE INDEX IF NOT EXISTS idx_policies_bitis_tarihi ON policies(bitis_tarihi);
CREATE INDEX IF NOT EXISTS idx_policies_baslangic_tarihi ON policies(baslangic_tarihi);
CREATE INDEX IF NOT EXISTS idx_policies_tanzim_tarihi ON policies(tanzim_tarihi);
CREATE INDEX IF NOT EXISTS idx_policies_odeme_durumu ON policies(odeme_durumu);
CREATE INDEX IF NOT EXISTS idx_policies_record_type ON policies(record_type);
CREATE INDEX IF NOT EXISTS idx_policies_branch_group ON policies(branch_group);

-- ===================== POLICY PAYMENTS =====================
CREATE TABLE IF NOT EXISTS policy_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  note text,
  paid_at date NOT NULL DEFAULT now()::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE policy_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_policy_payments" ON policy_payments;
CREATE POLICY "select_own_policy_payments" ON policy_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_policy_payments" ON policy_payments;
CREATE POLICY "insert_own_policy_payments" ON policy_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_policy_payments" ON policy_payments;
CREATE POLICY "update_own_policy_payments" ON policy_payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_policy_payments" ON policy_payments;
CREATE POLICY "delete_own_policy_payments" ON policy_payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_policy_payments_policy_id ON policy_payments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_payments_user_id ON policy_payments(user_id);

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

-- ===================== INSURANCE COMPANIES =====================
CREATE TABLE IF NOT EXISTS insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_companies" ON insurance_companies;
CREATE POLICY "select_companies" ON insurance_companies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_companies" ON insurance_companies;
CREATE POLICY "insert_companies" ON insurance_companies FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_companies" ON insurance_companies;
CREATE POLICY "update_companies" ON insurance_companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_companies" ON insurance_companies;
CREATE POLICY "delete_companies" ON insurance_companies FOR DELETE TO authenticated USING (true);

-- ===================== INSURANCE BRANCHES =====================
CREATE TABLE IF NOT EXISTS insurance_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_group text NOT NULL DEFAULT 'DIGER',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_branches" ON insurance_branches;
CREATE POLICY "select_branches" ON insurance_branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_branches" ON insurance_branches;
CREATE POLICY "insert_branches" ON insurance_branches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_branches" ON insurance_branches;
CREATE POLICY "update_branches" ON insurance_branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_branches" ON insurance_branches;
CREATE POLICY "delete_branches" ON insurance_branches FOR DELETE TO authenticated USING (true);

-- ===================== BANK ACCOUNTS =====================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  iban text,
  card_limit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_banks" ON bank_accounts;
CREATE POLICY "select_banks" ON bank_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_banks" ON bank_accounts;
CREATE POLICY "insert_banks" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_banks" ON bank_accounts;
CREATE POLICY "update_banks" ON bank_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_banks" ON bank_accounts;
CREATE POLICY "delete_banks" ON bank_accounts FOR DELETE TO authenticated USING (true);

-- ===================== SUB AGENTS =====================
CREATE TABLE IF NOT EXISTS sub_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commission_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sub_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_sub_agents" ON sub_agents;
CREATE POLICY "select_sub_agents" ON sub_agents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_sub_agents" ON sub_agents;
CREATE POLICY "insert_sub_agents" ON sub_agents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_sub_agents" ON sub_agents;
CREATE POLICY "update_sub_agents" ON sub_agents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_sub_agents" ON sub_agents;
CREATE POLICY "delete_sub_agents" ON sub_agents FOR DELETE TO authenticated USING (true);

-- ===================== QUOTES =====================
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text,
  branch_group text,
  insurance_type text,
  status text DEFAULT 'acik',
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  bitis_tarihi date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_quotes" ON quotes;
CREATE POLICY "select_quotes" ON quotes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_quotes" ON quotes;
CREATE POLICY "insert_quotes" ON quotes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_quotes" ON quotes;
CREATE POLICY "update_quotes" ON quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_quotes" ON quotes;
CREATE POLICY "delete_quotes" ON quotes FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_name);

-- ===================== QUOTE ITEMS =====================
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  premium_amount numeric DEFAULT 0,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_quote_items" ON quote_items;
CREATE POLICY "select_quote_items" ON quote_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_quote_items" ON quote_items;
CREATE POLICY "insert_quote_items" ON quote_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_quote_items" ON quote_items;
CREATE POLICY "update_quote_items" ON quote_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_quote_items" ON quote_items;
CREATE POLICY "delete_quote_items" ON quote_items FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- ===================== LOST CUSTOMERS =====================
CREATE TABLE IF NOT EXISTS lost_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text,
  insurance_type text,
  reason text,
  lost_company text,
  premium_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lost_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_lost_customers" ON lost_customers;
CREATE POLICY "select_lost_customers" ON lost_customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_lost_customers" ON lost_customers;
CREATE POLICY "insert_lost_customers" ON lost_customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_lost_customers" ON lost_customers;
CREATE POLICY "update_lost_customers" ON lost_customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_lost_customers" ON lost_customers;
CREATE POLICY "delete_lost_customers" ON lost_customers FOR DELETE TO authenticated USING (true);

-- ===================== AGENCY PROFILES =====================
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
CREATE POLICY "select_own_agency_profile" ON agency_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_agency_profile" ON agency_profiles;
CREATE POLICY "insert_own_agency_profile" ON agency_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_agency_profile" ON agency_profiles;
CREATE POLICY "update_own_agency_profile" ON agency_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_agency_profile" ON agency_profiles;
CREATE POLICY "delete_own_agency_profile" ON agency_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_damage_user_id ON damage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_user_id ON accounting_entries(user_id);

-- ===================== STORAGE BUCKETS =====================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('policy-files', 'policy-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public) VALUES
  ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES
  ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for policy-files (private, authenticated only)
DROP POLICY IF EXISTS "auth_read_policy_files" ON storage.objects;
CREATE POLICY "auth_read_policy_files" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'policy-files');
DROP POLICY IF EXISTS "auth_insert_policy_files" ON storage.objects;
CREATE POLICY "auth_insert_policy_files" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'policy-files');
DROP POLICY IF EXISTS "auth_update_policy_files" ON storage.objects;
CREATE POLICY "auth_update_policy_files" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'policy-files') WITH CHECK (bucket_id = 'policy-files');
DROP POLICY IF EXISTS "auth_delete_policy_files" ON storage.objects;
CREATE POLICY "auth_delete_policy_files" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'policy-files');

-- Storage policies for agency-logos (public read, authenticated write)
DROP POLICY IF EXISTS "auth_read_agency_logos" ON storage.objects;
CREATE POLICY "auth_read_agency_logos" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'agency-logos');
DROP POLICY IF EXISTS "auth_insert_agency_logos" ON storage.objects;
CREATE POLICY "auth_insert_agency_logos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'agency-logos');
DROP POLICY IF EXISTS "auth_update_agency_logos" ON storage.objects;
CREATE POLICY "auth_update_agency_logos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'agency-logos') WITH CHECK (bucket_id = 'agency-logos');
DROP POLICY IF EXISTS "auth_delete_agency_logos" ON storage.objects;
CREATE POLICY "auth_delete_agency_logos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'agency-logos');

-- Storage policies for company-logos (public read, authenticated write)
DROP POLICY IF EXISTS "public_read_company_logos" ON storage.objects;
CREATE POLICY "public_read_company_logos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'company-logos');
DROP POLICY IF EXISTS "auth_insert_company_logos" ON storage.objects;
CREATE POLICY "auth_insert_company_logos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'company-logos');
DROP POLICY IF EXISTS "auth_update_company_logos" ON storage.objects;
CREATE POLICY "auth_update_company_logos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'company-logos') WITH CHECK (bucket_id = 'company-logos');
DROP POLICY IF EXISTS "auth_delete_company_logos" ON storage.objects;
CREATE POLICY "auth_delete_company_logos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'company-logos');