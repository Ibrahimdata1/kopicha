-- Store cashier temp password so owner can look it up anytime
alter table profiles add column if not exists temp_password text;
