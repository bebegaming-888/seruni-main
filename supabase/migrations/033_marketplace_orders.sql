-- ============================================================
-- MIGRATION 033: Marketplace Order Management System
--
-- Tables:
--   1. marketplace_orders        — order header
--   2. marketplace_order_items  — line items (snapshot of product)
--   3. generate_order_id()      — auto-generates MPD-YYYYMMDD-XXXXXX
--   4. update_updated_at()      — auto-update updated_at
--
-- Storage:
--   payment_proofs bucket       — bukti transfer uploads
--
-- RLS: public insert (anyone can create order),
--      admin has full access
-- ============================================================

BEGIN;

-- ── marketplace_orders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         TEXT        UNIQUE NOT NULL,
  buyer_name       TEXT        NOT NULL,
  buyer_wa         TEXT        NOT NULL,
  buyer_address    TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending_payment'
                      CHECK (status IN (
                        'pending_payment',
                        'awaiting_confirmation',
                        'confirmed',
                        'processing',
                        'shipped',
                        'completed',
                        'cancelled'
                      )),
  total_amount     NUMERIC(12,0) NOT NULL DEFAULT 0,
  payment_method   TEXT
                      CHECK (payment_method IN ('bank_transfer','cod') OR payment_method IS NULL),
  payment_proof_url TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── marketplace_order_items ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID         NOT NULL
                      REFERENCES public.marketplace_orders(id)
                      ON DELETE CASCADE,
  product_id   TEXT         NOT NULL,
  product_name TEXT         NOT NULL,  -- snapshot at order time
  seller_name  TEXT         NOT NULL,
  seller_wa    TEXT         NOT NULL,
  quantity     INT          NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(12,0) NOT NULL,
  subtotal     NUMERIC(12,0) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ── auto-update updated_at ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketplace_orders_updated_at ON public.marketplace_orders;
CREATE TRIGGER marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── auto-generate order_id: MPD-YYYYMMDD-NNNNNN ────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
  yr  TEXT := TO_CHAR(NOW(), 'YYYY');
  mo  TEXT := TO_CHAR(NOW(), 'MM');
  dy  TEXT := TO_CHAR(NOW(), 'DD');
  cnt INT;
BEGIN
  SELECT COUNT(*) + 1 INTO cnt
    FROM public.marketplace_orders
   WHERE order_id LIKE 'MPD-'||yr||mo||dy||'%';

  NEW.order_id := 'MPD-'||yr||mo||dy||'-'||LPAD(cnt::TEXT,6,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketplace_orders_generate_order_id ON public.marketplace_orders;
CREATE TRIGGER marketplace_orders_generate_order_id
  BEFORE INSERT ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_id();

-- ── indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status       ON public.marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON public.marketplace_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_wa     ON public.marketplace_orders(buyer_wa);
CREATE INDEX IF NOT EXISTS idx_orders_order_id     ON public.marketplace_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.marketplace_order_items(order_id);

-- ── payment_proofs storage bucket ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment_proofs', 'payment_proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "payment_proofs_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment_proofs');

CREATE POLICY "payment_proofs_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment_proofs'
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

CREATE POLICY "payment_proofs_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'payment_proofs'
    AND auth.role() = 'service_role'
  );

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.marketplace_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- Helper: check if caller is service_role (admin/system)
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.role() = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- marketplace_orders policies
CREATE POLICY "orders_public_insert" ON public.marketplace_orders
  FOR INSERT WITH CHECK (true);  -- anyone can place an order

CREATE POLICY "orders_public_select" ON public.marketplace_orders
  FOR SELECT USING (true);  -- anyone can view their own (filtered client-side by buyer_wa)

CREATE POLICY "orders_service_update" ON public.marketplace_orders
  FOR UPDATE USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE POLICY "orders_service_delete" ON public.marketplace_orders
  FOR DELETE USING (public.is_service_role());

-- marketplace_order_items policies
CREATE POLICY "order_items_public_insert" ON public.marketplace_order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_public_select" ON public.marketplace_order_items
  FOR SELECT USING (true);

CREATE POLICY "order_items_service_delete" ON public.marketplace_order_items
  FOR DELETE USING (public.is_service_role());

-- ── Note: marketplace_products stored in cms_contents table (polymorphic)
--        Stock management handled via IndexedDB marketplace store.
--        Products synced to Supabase via cms_contents.metadata JSONB.

COMMIT;
