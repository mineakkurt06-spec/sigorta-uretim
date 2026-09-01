/*
# Add commission_rate column to agencies table

1. Modified Tables
- `agencies`
  - Added `commission_rate` (numeric, default 0) — Net Prim Komisyon Yüzdesi (e.g. 7 means 7%)

2. Notes
- The column is nullable-safe with a default of 0 so existing rows are unaffected.
- Numeric(5,2) allows values from 0.00 to 999.99 — more than enough for percentage rates.
*/

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 0;
