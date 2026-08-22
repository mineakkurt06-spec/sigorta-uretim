/*
# Add is_external flag to agencies

1. Modified Tables
- `agencies`: add `is_external` boolean column (default false)
  - Internal agencies have is_external = false (existing behavior)
  - External agencies have is_external = true (no commission, separate management)
2. Security
- No new RLS policies needed; existing agencies policies cover the new column
3. Notes
- External agencies are managed via a separate "Dış Acente Yönetimi" page
- External agency productions (uretim_tipi = 'dis') do not contribute to total net/gross prim
- AgencyReports filters internal vs external agencies separately
*/

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;
