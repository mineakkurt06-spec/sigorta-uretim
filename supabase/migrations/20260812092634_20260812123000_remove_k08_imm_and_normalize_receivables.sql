/*
# Remove K08-İMM classification and normalize receivables

1. Modified data
- Existing policy rows whose insurance type is exactly `K08-İMM` or `K08-IMM` have that classification cleared while the policy row and all financial data remain intact.
- Existing policy payment rows are preserved.

2. Receivable behavior
- Policies with payment totals greater than or equal to their gross premium are marked `verdi`.
- Policies with an outstanding balance remain `verecek`.

3. Security
- No tables, columns, or RLS policies are removed or weakened.
- Existing owner-scoped policies remain unchanged.

4. Important notes
- No policy or payment row is deleted.
- Clearing the retired classification prevents K08-İMM from appearing in forms, reports, or charts while preserving the underlying production record.
*/

UPDATE policies
SET sigorta_turu = NULL
WHERE upper(trim(sigorta_turu)) IN ('K08-İMM', 'K08-IMM');

UPDATE policies p
SET odeme_durumu = 'verdi', aciklama = NULL
WHERE p.odeme_durumu = 'verecek'
  AND p.brut_prim <= COALESCE((
    SELECT SUM(pp.amount)
    FROM policy_payments pp
    WHERE pp.policy_id = p.id
  ), 0);