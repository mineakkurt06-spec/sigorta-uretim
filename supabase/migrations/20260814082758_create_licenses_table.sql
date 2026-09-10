/*
# Create licenses table for HWID-based license control

1. New Tables
- `licenses`
  - `id` (uuid, primary key)
  - `license_key` (text, unique, not null) — the license string the user enters
  - `is_active` (boolean, default true) — whether the license is valid
  - `hwid` (text, nullable) — bound hardware/device ID; null means not yet bound
  - `created_at` (timestamptz, default now())
  - `bound_at` (timestamptz, nullable) — when the HWID was first bound

2. Security
- Enable RLS on `licenses`.
- Allow anon + authenticated SELECT and UPDATE so the license verification
  flow works before the user signs in (the check runs before auth).

3. Notes
- The license gate runs BEFORE the Supabase auth screen, so the anon key
  client must be able to look up a license key and bind the HWID on first use.
- INSERT and DELETE are intentionally NOT granted to anon — only admins
  should create or remove licenses (via the Supabase dashboard or a
  SECURITY DEFINER function).
*/

CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  hwid text,
  created_at timestamptz DEFAULT now(),
  bound_at timestamptz
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_licenses" ON licenses;
CREATE POLICY "anon_select_licenses"
ON licenses FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_licenses" ON licenses;
CREATE POLICY "anon_update_licenses"
ON licenses FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);
