// The policies table is missing several columns that the form sends.
// Until the migration to add them is applied, strip them from insert/update
// payloads so Supabase doesn't reject the operation with a 42703 error.
// Once the columns exist in the database, this list can be emptied.
const MISSING_POLICY_COLUMNS = new Set([
  'belge_seri_no',
  'durum',
  'iptal_tarihi',
  'iptal_nedeni',
  'iade_tutari',
  'iptal_net_prim',
  'iptal_notu',
]);

export function stripMissingColumns(payload: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!MISSING_POLICY_COLUMNS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}
