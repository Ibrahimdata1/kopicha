-- Self-service registration with optional referral/agent code
-- If referral code is provided → shop is marked as setup_fee_paid (agent collected ฿999)
-- If no referral code → shop needs to pay ฿999 setup fee to Kopicha

CREATE OR REPLACE FUNCTION self_register_shop(
  p_shop_name TEXT,
  p_promptpay TEXT,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_shop_id UUID;
  v_has_referral BOOLEAN := (p_referral_code IS NOT NULL AND trim(p_referral_code) != '');
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;
  IF v_profile.role IS NOT NULL THEN
    RETURN json_build_object('error', 'User already has a role');
  END IF;

  INSERT INTO shops (name, promptpay_id, table_count, tax_rate, payment_mode, referral_code, setup_fee_paid)
  VALUES (p_shop_name, p_promptpay, 10, 0.07, 'counter',
          CASE WHEN v_has_referral THEN trim(p_referral_code) ELSE NULL END,
          v_has_referral)
  RETURNING id INTO v_shop_id;

  UPDATE profiles
  SET role = 'owner',
      shop_id = v_shop_id,
      pending_shop_name = NULL,
      pending_promptpay = NULL
  WHERE id = v_user_id;

  RETURN json_build_object('shop_id', v_shop_id, 'referral', v_has_referral);
END;
$$;
