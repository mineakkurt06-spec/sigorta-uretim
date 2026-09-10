/*
# TANIMLAMA Modülleri ve Genişletilmiş Özellikler

## Yeni Tablolar
1. insurance_companies - Sigorta şirketleri (name, logo_url)
2. insurance_branches - Branşlar (name, branch_group: OTO/KONUT/DIGER)
3. bank_accounts - Banka hesapları (bank_name, account_name, iban, card_limit)
4. sub_agents - Tali acenteler (name, commission_rate)
5. quotes - Teklifler (customer_name, branch_group, insurance_type, status)
6. quote_items - Teklif kalemleri (quote_id, company_name, premium_amount)
7. lost_customers - Kaçan müşteriler (customer_name, phone, insurance_type, reason, lost_company, premium_amount)

## Modifiye Tablolar
- policies: + record_type, bank_account_id, branch_group
- customers: + uavt_adres_kodu

## Notlar
- damage_records ve reminders tabloları zaten mevcut (Türkçe kolon adlarıyla)
- staff tablosu zaten mevcut
*/

-- 1. Sigorta Şirketleri
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

-- 2. Branşlar
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

-- 3. Banka Hesapları
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

-- 4. Tali Acenteler
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

-- 5. Teklifler
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  branch_group text,
  insurance_type text,
  status text DEFAULT 'acik',
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

-- 6. Teklif Kalemleri
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  premium_amount numeric DEFAULT 0,
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

-- 7. Kaçan Müşteriler
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

-- Add columns to policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policies' AND column_name = 'record_type') THEN
    ALTER TABLE policies ADD COLUMN record_type text DEFAULT 'uretim';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policies' AND column_name = 'bank_account_id') THEN
    ALTER TABLE policies ADD COLUMN bank_account_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policies' AND column_name = 'branch_group') THEN
    ALTER TABLE policies ADD COLUMN branch_group text;
  END IF;
END $$;

-- Add UAVT column to customers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'uavt_adres_kodu') THEN
    ALTER TABLE customers ADD COLUMN uavt_adres_kodu text;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_policies_record_type ON policies(record_type);
CREATE INDEX IF NOT EXISTS idx_policies_branch_group ON policies(branch_group);
