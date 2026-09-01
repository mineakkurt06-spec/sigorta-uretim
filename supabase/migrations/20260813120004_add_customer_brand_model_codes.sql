/*
# Add brand_code and model_code columns to customers table

1. New Columns
- `customers.marka_kodu` (text) — Brand code for the customer's vehicle
- `customers.model_kodu` (text) — Model code for the customer's vehicle
2. Notes
- Both columns are nullable text fields, additive only — no existing data is affected.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'marka_kodu') THEN
    ALTER TABLE customers ADD COLUMN marka_kodu text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'model_kodu') THEN
    ALTER TABLE customers ADD COLUMN model_kodu text;
  END IF;
END $$;
