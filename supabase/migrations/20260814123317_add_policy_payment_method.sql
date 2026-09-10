ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Nakit';

COMMENT ON COLUMN policies.payment_method IS 'Ödeme yöntemi: Kredi Kartı veya Nakit';
