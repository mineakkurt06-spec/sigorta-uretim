/*
# Add aciklama column to policies

## Overview
Adds a free-text description column to the policies table so users can attach
a note when a policy is marked "verecek" (pending payment). The description is
visible in the receivables list.

## Modified Tables
- `policies.aciklama` (text, nullable): optional description entered when the
  policy is created/edited, typically used to explain why a receivable is owed.

## Security
- No RLS changes. Existing owner-scoped policies on `policies` already cover
  SELECT/INSERT/UPDATE/DELETE for the authenticated owner, and the new column
  is automatically accessible under those same policies.

## Important Notes
1. No existing data is deleted or altered.
2. The column is nullable so existing rows remain valid without backfill.
*/

ALTER TABLE policies ADD COLUMN IF NOT EXISTS aciklama text;
