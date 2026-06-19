-- Run once in Supabase SQL Editor if the API fails with "column ... does not exist"
-- or if Render crashes with "column ... already exists" during migration.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- Rough -> Polish conversion fields
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS rough_buying_no     integer;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS polished_carat      numeric;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_pieces integer;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS not_polished_carat  numeric;

-- Transfer polish by shape
ALTER TABLE transferitems ADD COLUMN IF NOT EXISTS shape_name varchar(100);

-- Vendor consignment polish by shape
ALTER TABLE vendorissueitems ADD COLUMN IF NOT EXISTS shape_name varchar(100);
ALTER TABLE vendorissueitems ADD COLUMN IF NOT EXISTS carat numeric;

-- Polish sales shape link + transfer/vendor carat
ALTER TABLE transferitems ADD COLUMN IF NOT EXISTS carat numeric;
ALTER TABLE polishsales ADD COLUMN IF NOT EXISTS shape_name varchar(100);

-- Tell EF these migrations are already applied (fixes duplicate-column crash on deploy)
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
  ('20260619121551_AddConversionDetailFields', '8.0.4'),
  ('20260619125028_AddTransferShapeName', '8.0.4'),
  ('20260619130109_AddVendorIssueShapeName', '8.0.4'),
  ('20260619134424_AddShapeCaratFields', '8.0.4')
ON CONFLICT ("MigrationId") DO NOTHING;
