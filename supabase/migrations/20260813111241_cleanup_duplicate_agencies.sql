-- Keep one agency per name, delete duplicates.
-- For agencies with policies, keep the one that has policies.

-- Keep 4903d360 (BAHA SİGORTA, has 1 policy), delete the other 2
DELETE FROM agencies WHERE id IN ('a23199eb-a083-4caa-b3d3-7e6d056c3bc0', '17343f1c-fcf6-4904-bbcc-277c19214484');

-- Keep 5f63f5cd (BİC SİGORTA, has 2 policies), delete the other 2
DELETE FROM agencies WHERE id IN ('ed1e7d2d-b317-44b5-8144-10869e4e3251', '1e1c65f0-b043-4aee-b3c6-30ef0ec17bca');

-- Keep ad4e7d47 (HÜDAYİ AKDEMİR SİGORTA), delete the other 2
DELETE FROM agencies WHERE id IN ('478c7da3-cd74-4a11-a1e3-933fd229128e', 'e40a4914-84b1-4835-a833-ee17279a7cc5');

-- Keep 3bf2d564 (İDS SİGORTA), delete the other 2
DELETE FROM agencies WHERE id IN ('2a004171-1667-421d-aeec-0db0bd9dfad7', 'ce80114b-aa93-450f-a7bd-2d327d291357');

-- Rename KARUM → KARUN, keep ddaafc88, delete the other 2
DELETE FROM agencies WHERE id IN ('fedea0f8-a678-4de2-9622-06e727c62ea3', 'ded02b84-c1ae-47ad-95ce-82d1ba8165ad');
UPDATE agencies SET name = 'KARUN SİGORTA' WHERE id = 'ddaafc88-02f0-4028-9002-3c6e87c1dd68';

-- Keep 50d95e2c (SHOWROOM SİGORTA), delete the other 2
DELETE FROM agencies WHERE id IN ('6c8a896b-facc-4085-b36f-44d01715d760', '96bc9ef7-c303-4ddf-9dd5-fe47a73b8912');

-- Keep 9646c915 (SİGORTA EVRENİ), delete the other 2
DELETE FROM agencies WHERE id IN ('58d14a3f-a139-4779-8ddb-e67619640abc', 'd8ec99d6-6605-4043-a6c6-8bf070f45408');

-- Keep 098c16d0 (SİGORTALİA), delete the other 2
DELETE FROM agencies WHERE id IN ('680e13cf-5d3c-4bbf-a47e-2875fd1e8a45', 'f0856c7b-af30-491b-adc1-e372f9b0ba17');

-- Add the missing 9th agency with the same user_id as existing agencies
INSERT INTO agencies (name, user_id) SELECT 'MİNE AKKURT SİGORTA', user_id FROM agencies LIMIT 1;
