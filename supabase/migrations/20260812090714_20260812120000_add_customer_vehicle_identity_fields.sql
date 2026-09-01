/*
# Add customer identity and vehicle fields

1. New columns
- `customers.ruhsat_belge_no`: vehicle registration document number.
- `customers.plaka_no`: vehicle plate number.
- `customers.motor_no`: vehicle engine number.
- `customers.sase_no`: vehicle chassis number.

2. Modified tables
- `customers`: adds the requested vehicle and registration details without changing existing rows or columns.

3. Security
- The existing owner-scoped RLS policies remain in place. No new table or policy is introduced.

4. Important notes
- Existing customer records are preserved.
- All new fields are optional so existing customers remain valid.
*/

ALTER TABLE customers ADD COLUMN IF NOT EXISTS ruhsat_belge_no text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS plaka_no text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS motor_no text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sase_no text;