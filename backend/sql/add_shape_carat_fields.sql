-- Carat on transfers/vendor issues + shape on polish sales
ALTER TABLE transferitems ADD COLUMN IF NOT EXISTS carat numeric;
ALTER TABLE vendorissueitems ADD COLUMN IF NOT EXISTS carat numeric;
ALTER TABLE polishsales ADD COLUMN IF NOT EXISTS shape_name varchar(100);
