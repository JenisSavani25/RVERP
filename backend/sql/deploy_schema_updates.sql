-- Run once in Supabase SQL Editor if the API fails with "column ... does not exist".
-- Safe to re-run: uses IF NOT EXISTS for all columns.

-- Rough -> Polish conversion fields
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS rough_buying_no     integer;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS polished_carat      numeric;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_pieces integer;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_carat  numeric;

-- Transfer polish by shape
ALTER TABLE transferitems ADD COLUMN IF NOT EXISTS shape_name varchar(100);

-- Vendor consignment polish by shape
ALTER TABLE vendorissueitems ADD COLUMN IF NOT EXISTS shape_name varchar(100);
