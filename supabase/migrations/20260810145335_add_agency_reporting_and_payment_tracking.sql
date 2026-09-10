/*
# Agency reporting, vehicle plates, and payment tracking

## Overview
Adds the fields and durable records needed for agency-specific reports,
vehicle plate tracking, editable production records, and the receivables ledger.

## Modified Tables
- `policies.plaka`: vehicle plate entered with a production.
- `policies.baslangic_tarihi`: retained for the automatically calculated one-year start date.

## New Tables
- `policy_payments`: payments and deductions attached to a policy.
  - `policy_id`: related production.
  - `amount`: amount received or deducted from the receivable.
  - `note`: user-entered explanation.
  - `paid_at`: payment date.
  - `user_id`: signed-in owner.

## Security
- RLS enabled on `policy_payments`.
- Separate owner-scoped SELECT, INSERT, UPDATE, and DELETE policies.
- Existing owner-scoped policy CRUD remains available for corrections and removal.

## Important Notes
1. No existing policy or payment data is deleted.
2. Agency and receivable reports are derived from the selected agency and payment status on each policy.
3. The application calculates policy start dates from the selected end date before saving.
*/

ALTER TABLE policies ADD COLUMN IF NOT EXISTS plaka text;

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