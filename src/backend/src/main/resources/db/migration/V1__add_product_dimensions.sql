-- Add dimension columns to products table for accurate shipping calculation
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS length INT NULL COMMENT 'Chiều dài (cm)',
  ADD COLUMN IF NOT EXISTS width  INT NULL COMMENT 'Chiều rộng (cm)',
  ADD COLUMN IF NOT EXISTS height INT NULL COMMENT 'Chiều cao (cm)',
  ADD COLUMN IF NOT EXISTS weight INT NULL COMMENT 'Cân nặng (gram)';

-- Set fallback defaults for existing rows that haven't been migrated
UPDATE products
SET
  length = COALESCE(length, 20),
  width  = COALESCE(width, 20),
  height = COALESCE(height, 20),
  weight = COALESCE(weight, 1000)
WHERE length IS NULL OR width IS NULL OR height IS NULL OR weight IS NULL;
