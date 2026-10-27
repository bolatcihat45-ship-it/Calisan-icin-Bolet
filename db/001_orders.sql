-- Apply once to the Neon PostgreSQL database before enabling any order channel.
-- UUIDs are created by the application; no database extension is required.
CREATE TABLE IF NOT EXISTS bolet_orders (
  id UUID PRIMARY KEY,
  order_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('phone', 'website')),
  source_ref TEXT NOT NULL,
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  pickup_requested TEXT NOT NULL,
  pickup_status TEXT NOT NULL DEFAULT 'awaiting_shop_confirmation'
    CHECK (pickup_status = 'awaiting_shop_confirmation'),
  order_status TEXT NOT NULL DEFAULT 'new'
    CHECK (order_status IN ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT,
  customer_phone TEXT,
  customer_confirmed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);

CREATE TABLE IF NOT EXISTS bolet_order_drafts (
  id UUID PRIMARY KEY,
  call_id TEXT NOT NULL,
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  pickup_requested TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS bolet_order_drafts_call_pending_idx
  ON bolet_order_drafts (call_id, created_at DESC)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS bolet_notification_outbox (
  order_id UUID PRIMARY KEY REFERENCES bolet_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS bolet_notification_outbox_retry_idx
  ON bolet_notification_outbox (next_attempt_at, created_at)
  WHERE status <> 'sent';

CREATE INDEX IF NOT EXISTS bolet_orders_staff_queue_idx
  ON bolet_orders (order_status, created_at DESC);
