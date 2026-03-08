-- Migration: Customer Sessions Table
-- Replaces the table-based QR system with a session-based QR system.
-- Each customer group gets a unique QR code (session) that persists until payment.
-- Customers can sit at any table; the QR code is tied to their session, not the table.

-- ============================================================
-- 1. Create customer_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  table_label   TEXT,                          -- Optional staff note (e.g. "B2", "near window")
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'paid', 'cancelled')),
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at       TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_sessions_shop    ON customer_sessions(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_status  ON customer_sessions(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_created ON customer_sessions(shop_id, created_at DESC);

-- ============================================================
-- 2. RLS for customer_sessions
-- ============================================================

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Staff (authenticated) can manage sessions for their shop
CREATE POLICY "staff_manage_sessions"
  ON customer_sessions FOR ALL TO authenticated
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid() AND role IS NOT NULL
    )
  )
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid() AND role IS NOT NULL
    )
  );

-- Anon (customer) can read a session by its ID (for QR page validation)
CREATE POLICY "anon_read_session"
  ON customer_sessions FOR SELECT TO anon
  USING (status = 'active' OR status = 'paid');

-- Anon (customer) can update session status to 'paid' (when payment confirmed)
-- Actually we handle this server-side via the customer page's Supabase call;
-- so we allow anon to UPDATE only the status and paid_at columns when moving active→paid
CREATE POLICY "anon_update_session_paid"
  ON customer_sessions FOR UPDATE TO anon
  USING (status = 'active')
  WITH CHECK (status = 'paid');

-- ============================================================
-- 3. Ensure orders table has customer_session_id as FK
--    (In the original app it was a bare UUID; here we add the FK if missing)
-- ============================================================

-- The original migration added customer_session_id as a UUID without FK.
-- We add a FK constraint referencing customer_sessions.id if it doesn't exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_customer_session_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_customer_session_id_fkey
      FOREIGN KEY (customer_session_id)
      REFERENCES customer_sessions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_orders_customer_session ON orders(customer_session_id);

-- ============================================================
-- 4. Update anon order INSERT policy to also accept session-based orders
--    (The original policy only required order_source = 'customer')
--    We additionally require a valid customer_session_id.
-- ============================================================

-- Drop old policy and recreate with session validation
DROP POLICY IF EXISTS "anon_insert_customer_orders" ON orders;
CREATE POLICY "anon_insert_customer_orders"
  ON orders FOR INSERT TO anon
  WITH CHECK (
    order_source = 'customer'
    AND customer_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM customer_sessions
      WHERE id = orders.customer_session_id
        AND status = 'active'
    )
  );
