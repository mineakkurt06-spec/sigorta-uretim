/*
# Clean up policy company names to match insurance company logos

1. Modified Tables
- `policies`: cleans the `sigorta_sirketi` column by:
  - Stripping tab characters and extra/trailing whitespace
  - Normalizing Turkish character variants to match canonical company names from `insurance_companies`
2. Security
- No policy changes.
3. Important notes
- No data is deleted. Only the `sigorta_sirketi` text field is updated to remove whitespace corruption and match the canonical spelling used in the `insurance_companies` table.
- Names that already match a company are left unchanged.
*/

-- Step 1: Strip tabs and collapse whitespace in all policy company names
UPDATE policies
SET sigorta_sirketi = TRIM(REGEXP_REPLACE(sigorta_sirketi, '[\t\n\r]+', ' ', 'g'));

-- Step 2: Map dirty/variant names to canonical company names
UPDATE policies SET sigorta_sirketi = 'ALLIANZ SİGORTA'  WHERE sigorta_sirketi ILIKE 'ALLİANZ%';
UPDATE policies SET sigorta_sirketi = 'ETHICA SİGORTA'   WHERE sigorta_sirketi ILIKE 'ETHİCA%';
UPDATE policies SET sigorta_sirketi = 'HDİ SİGORTA'      WHERE sigorta_sirketi ILIKE 'HDI%';
UPDATE policies SET sigorta_sirketi = 'QUICK SİGORTA'    WHERE sigorta_sirketi ILIKE 'QUİCK%';
UPDATE policies SET sigorta_sirketi = 'UNICO SİGORTA'    WHERE sigorta_sirketi ILIKE 'UNİCO%';
UPDATE policies SET sigorta_sirketi = 'ZURICH SİGORTA'   WHERE sigorta_sirketi ILIKE 'ZURİCH%';
UPDATE policies SET sigorta_sirketi = 'AKSİGORTA'        WHERE sigorta_sirketi ILIKE 'AK SİGORTA%';
