-- Run on Supabase before deploying backend update.
-- Allows polish transfers to store shape name instead of polish lot id.

ALTER TABLE transferitems ADD COLUMN IF NOT EXISTS shape_name varchar(100);
