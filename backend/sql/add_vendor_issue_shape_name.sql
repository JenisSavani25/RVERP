-- Run on Supabase before deploying backend update.
ALTER TABLE vendorissueitems ADD COLUMN IF NOT EXISTS shape_name varchar(100);
