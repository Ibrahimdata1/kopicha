-- Seed demo data for superadmin@admin.com
-- Creates a demo shop with Thai café products

DO $$
DECLARE
  v_admin_id UUID;
  v_shop_id  UUID;
  v_cat1     UUID;
  v_cat2     UUID;
  v_cat3     UUID;
BEGIN
  -- Look up superadmin user
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'superadmin@admin.com'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'superadmin@admin.com not found in auth.users';
  END IF;

  -- Create demo shop
  INSERT INTO shops (name, promptpay_id, tax_rate, table_count)
  VALUES ('Kopicha Demo Café', '0891234567', 7.0, 12)
  RETURNING id INTO v_shop_id;

  -- Link shop to super admin profile
  UPDATE profiles
  SET shop_id = v_shop_id
  WHERE id = v_admin_id;

  -- Create categories
  INSERT INTO categories (shop_id, name, sort_order)
  VALUES (v_shop_id, 'เครื่องดื่ม', 1)
  RETURNING id INTO v_cat1;

  INSERT INTO categories (shop_id, name, sort_order)
  VALUES (v_shop_id, 'อาหาร', 2)
  RETURNING id INTO v_cat2;

  INSERT INTO categories (shop_id, name, sort_order)
  VALUES (v_shop_id, 'ของหวาน', 3)
  RETURNING id INTO v_cat3;

  -- Drinks
  INSERT INTO products (shop_id, category_id, name, price, stock, is_active, barcode) VALUES
    (v_shop_id, v_cat1, 'กาแฟดำร้อน', 45, 999, true, 'BLK-HOT'),
    (v_shop_id, v_cat1, 'ลาเต้ร้อน', 65, 999, true, 'LAT-HOT'),
    (v_shop_id, v_cat1, 'ลาเต้เย็น', 75, 999, true, 'LAT-ICE'),
    (v_shop_id, v_cat1, 'คาปูชิโน่', 65, 999, true, 'CAP-HOT'),
    (v_shop_id, v_cat1, 'ชาเย็น', 55, 999, true, 'TEA-ICE'),
    (v_shop_id, v_cat1, 'มัทฉะลาเต้', 85, 999, true, 'MAT-ICE'),
    (v_shop_id, v_cat1, 'สมูทตี้มะม่วง', 90, 999, true, 'SMT-MNG'),
    (v_shop_id, v_cat1, 'น้ำส้มคั้นสด', 60, 999, true, 'OJC-FRS');

  -- Food
  INSERT INTO products (shop_id, category_id, name, price, stock, is_active, barcode) VALUES
    (v_shop_id, v_cat2, 'ข้าวไข่เจียว', 80, 50, true, 'RCE-EGG'),
    (v_shop_id, v_cat2, 'แซนด์วิชแฮมชีส', 95, 30, true, 'SND-HAM'),
    (v_shop_id, v_cat2, 'ครัวซองต์เนย', 75, 20, true, 'CRS-BTR'),
    (v_shop_id, v_cat2, 'พาสต้าคาโบนาร่า', 145, 20, true, 'PST-CAR');

  -- Desserts
  INSERT INTO products (shop_id, category_id, name, price, stock, is_active, barcode) VALUES
    (v_shop_id, v_cat3, 'เค้กช็อกโกแลต', 85, 15, true, 'CKE-CHC'),
    (v_shop_id, v_cat3, 'ชีสเค้ก', 95, 15, true, 'CKE-CHS'),
    (v_shop_id, v_cat3, 'ทาร์ตไข่', 55, 20, true, 'TRT-EGG'),
    (v_shop_id, v_cat3, 'บราวนี่', 65, 20, true, 'BRW-CHC');

  RAISE NOTICE 'Demo data created. Shop ID: %, Admin ID: %', v_shop_id, v_admin_id;
END $$;
