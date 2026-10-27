-- Apply once to an existing database to add the employee order queue.
ALTER TABLE bolet_orders
  ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'new';

ALTER TABLE bolet_orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bolet_orders_order_status_check'
      AND conrelid = 'bolet_orders'::regclass
  ) THEN
    ALTER TABLE bolet_orders
      ADD CONSTRAINT bolet_orders_order_status_check
      CHECK (order_status IN ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bolet_orders_staff_queue_idx
  ON bolet_orders (order_status, created_at DESC);
