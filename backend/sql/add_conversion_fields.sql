-- Run this on Supabase (SQL editor) BEFORE deploying the updated backend.
-- Adds the extra columns used by the new Rough -> Polish Conversion module.
-- All columns are nullable so existing rows remain valid.

ALTER TABLE conversions ADD COLUMN IF NOT EXISTS rough_buying_no     integer;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS polished_carat      numeric;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_pieces integer;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_carat  numeric;
