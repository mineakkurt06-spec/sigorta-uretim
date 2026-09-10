/*
# Add notes column to quotes table

1. Modified Tables
- `quotes`: adds `notes` column (text, nullable) to store per-quote free-text notes.
2. Security
- No policy changes. The existing RLS policies on `quotes` already govern all CRUD; a new nullable column inherits those same policies automatically.
*/

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes text;
