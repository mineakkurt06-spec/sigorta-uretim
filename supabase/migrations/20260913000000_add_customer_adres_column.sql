/*
# Add "adres" (address) column to customers table

1. Changes
- Adds `adres` (text, nullable) column to the `customers` table.
- This is an optional address field for customers — no existing data is affected.
- Backward compatible: existing rows will have `adres = NULL`.

2. Security
- No RLS policy changes needed — the column inherits the table's existing policies.
*/

ALTER TABLE customers ADD COLUMN IF NOT EXISTS adres text;
