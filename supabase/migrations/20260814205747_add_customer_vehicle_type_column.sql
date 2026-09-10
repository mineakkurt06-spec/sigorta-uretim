/*
# Add arac_tipi (vehicle type) column to customers

1. Modified Tables
- `customers` — adds `arac_tipi` (text, nullable) for free-text vehicle type entry (e.g. Otomobil, Kamyonet, Motosiklet).
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'arac_tipi') THEN
    ALTER TABLE public.customers ADD COLUMN arac_tipi text;
  END IF;
END $$;
