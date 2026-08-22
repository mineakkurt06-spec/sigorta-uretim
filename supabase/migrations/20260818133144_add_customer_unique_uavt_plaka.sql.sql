-- Remove duplicate customers by UAVT, keeping the most recent one
DELETE FROM customers
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY uavt_adres_kodu ORDER BY created_at DESC) AS rn
    FROM customers
    WHERE uavt_adres_kodu IS NOT NULL AND uavt_adres_kodu != ''
  ) t WHERE rn > 1
);

-- Remove duplicate customers by plaka_no, keeping the most recent one
DELETE FROM customers
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(plaka_no)) ORDER BY created_at DESC) AS rn
    FROM customers
    WHERE plaka_no IS NOT NULL AND plaka_no != ''
  ) t WHERE rn > 1
);

-- Add unique indexes on non-empty UAVT and plaka values (partial indexes)
CREATE UNIQUE INDEX IF NOT EXISTS customers_uavt_adres_kodu_unique
  ON customers (uavt_adres_kodu)
  WHERE uavt_adres_kodu IS NOT NULL AND uavt_adres_kodu != '';

CREATE UNIQUE INDEX IF NOT EXISTS customers_plaka_no_unique
  ON customers (UPPER(TRIM(plaka_no)))
  WHERE plaka_no IS NOT NULL AND plaka_no != '';