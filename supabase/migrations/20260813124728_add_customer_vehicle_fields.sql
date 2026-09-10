/*
# Add vehicle year, brand, model, code columns to customers table

1. New Columns
- `customers.arac_yili` (text) — Vehicle year
- `customers.arac_markasi` (text) — Vehicle brand
- `customers.arac_modeli` (text) — Vehicle model
- `customers.arac_kodu` (text) — Vehicle code
2. Notes
- All columns are nullable text fields, additive only — no existing data is affected.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'arac_yili') THEN
    ALTER TABLE customers ADD COLUMN arac_yili text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'arac_markasi') THEN
    ALTER TABLE customers ADD COLUMN arac_markasi text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'arac_modeli') THEN
    ALTER TABLE customers ADD COLUMN arac_modeli text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'arac_kodu') THEN
    ALTER TABLE customers ADD COLUMN arac_kodu text;
  END IF;
END $$;
