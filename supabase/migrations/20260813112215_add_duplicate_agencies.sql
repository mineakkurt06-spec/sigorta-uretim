-- Add duplicates of the 4 agencies the user requested
INSERT INTO agencies (name, user_id) 
SELECT 'BAHA SİGORTA', user_id FROM agencies WHERE name = 'BAHA SİGORTA' LIMIT 1;
INSERT INTO agencies (name, user_id) 
SELECT 'SİGORTALİA', user_id FROM agencies WHERE name = 'SİGORTALİA' LIMIT 1;
INSERT INTO agencies (name, user_id) 
SELECT 'SHOWROOM SİGORTA', user_id FROM agencies WHERE name = 'SHOWROOM SİGORTA' LIMIT 1;
INSERT INTO agencies (name, user_id) 
SELECT 'KARUN SİGORTA', user_id FROM agencies WHERE name = 'KARUN SİGORTA' LIMIT 1;
