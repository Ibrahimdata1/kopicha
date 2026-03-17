-- System config table for super admin settings (e.g. company PromptPay QR)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default company PromptPay
INSERT INTO system_config (key, value) VALUES ('company_promptpay', '0994569544')
ON CONFLICT (key) DO NOTHING;

-- RLS: everyone can read, only super_admin can update
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_config" ON system_config
  FOR SELECT USING (true);

CREATE POLICY "super_admin_can_update_config" ON system_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
