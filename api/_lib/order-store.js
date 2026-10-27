import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

let cachedSql;

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Datenbank ist nicht konfiguriert.");
  cachedSql ??= neon(process.env.DATABASE_URL);
  return cachedSql;
}

export async function createPhoneDraft({ callId, items, totalCents, pickupRequested, customerName, customerPhone }) {
  const sql = database();
  const draftId = randomUUID();
  const rows = await sql`
    WITH superseded AS (
      UPDATE bolet_order_drafts SET status = 'superseded'
      WHERE call_id = ${callId} AND status = 'pending'
      RETURNING id
    )
    INSERT INTO bolet_order_drafts
      (id, call_id, items, total_cents, pickup_requested, customer_name, customer_phone)
    VALUES
      (${draftId}::uuid, ${callId}, ${JSON.stringify(items)}::jsonb, ${totalCents}, ${pickupRequested}, ${customerName}, ${customerPhone})
    RETURNING id, call_id, items, total_cents, pickup_requested, customer_name, customer_phone, expires_at
  `;
  return rows[0];
}

export async function confirmPhoneDraft({ draftId, callId, customerPhone, customerName }) {
  const sql = database();
  const idempotencyKey = `phone:${callId}`;
  const newId = randomUUID();
  const rows = await sql`
    WITH candidate AS (
      UPDATE bolet_order_drafts
      SET status = 'confirmed', confirmed_at = now(),
          customer_phone = COALESCE(${customerPhone}, customer_phone),
          customer_name = COALESCE(${customerName}, customer_name)
      WHERE id = ${draftId}::uuid AND call_id = ${callId} AND status = 'pending' AND expires_at > now()
      RETURNING items, total_cents, pickup_requested, customer_name, customer_phone
    ),
    inserted AS (
      INSERT INTO bolet_orders
        (id, idempotency_key, source, source_ref, items, total_cents, pickup_requested,
         customer_name, customer_phone, customer_confirmed_at)
      SELECT ${newId}::uuid, ${idempotencyKey}, 'phone', ${callId}, items, total_cents,
             pickup_requested, customer_name, customer_phone, now()
      FROM candidate
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id, order_number, items, total_cents, pickup_requested, customer_name, customer_phone
    ),
    existing AS (
      SELECT id, order_number, items, total_cents, pickup_requested, customer_name, customer_phone
      FROM bolet_orders
      WHERE idempotency_key = ${idempotencyKey} AND NOT EXISTS (SELECT 1 FROM inserted)
    ),
    resolved AS (
      SELECT * FROM inserted
      UNION ALL
      SELECT * FROM existing
    ),
    outbox AS (
      INSERT INTO bolet_notification_outbox (order_id)
      SELECT id FROM resolved
      ON CONFLICT (order_id) DO NOTHING
      RETURNING order_id
    )
    SELECT resolved.*, bolet_notification_outbox.status AS notification_status
    FROM resolved
    JOIN bolet_notification_outbox ON bolet_notification_outbox.order_id = resolved.id
  `;
  if (rows[0]) return rows[0];
  return findOrderByIdempotencyKey(idempotencyKey);
}

export async function createWebsiteOrder({ idempotencyKey, sourceRef, items, totalCents, pickupRequested, customerName, customerPhone }) {
  const sql = database();
  const newId = randomUUID();
  const rows = await sql`
    WITH inserted AS (
      INSERT INTO bolet_orders
        (id, idempotency_key, source, source_ref, items, total_cents, pickup_requested,
         customer_name, customer_phone, customer_confirmed_at)
      VALUES
        (${newId}::uuid, ${`website:${idempotencyKey}`}, 'website', ${sourceRef},
         ${JSON.stringify(items)}::jsonb, ${totalCents}, ${pickupRequested},
         ${customerName}, ${customerPhone}, now())
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id, order_number, items, total_cents, pickup_requested, customer_name, customer_phone
    ),
    existing AS (
      SELECT id, order_number, items, total_cents, pickup_requested, customer_name, customer_phone
      FROM bolet_orders
      WHERE idempotency_key = ${`website:${idempotencyKey}`} AND NOT EXISTS (SELECT 1 FROM inserted)
    ),
    resolved AS (
      SELECT * FROM inserted
      UNION ALL
      SELECT * FROM existing
    ),
    outbox AS (
      INSERT INTO bolet_notification_outbox (order_id)
      SELECT id FROM resolved
      ON CONFLICT (order_id) DO NOTHING
      RETURNING order_id
    )
    SELECT resolved.*, bolet_notification_outbox.status AS notification_status
    FROM resolved
    JOIN bolet_notification_outbox ON bolet_notification_outbox.order_id = resolved.id
  `;
  if (rows[0]) return rows[0];
  return findOrderByIdempotencyKey(`website:${idempotencyKey}`);
}

async function findOrderByIdempotencyKey(idempotencyKey) {
  const sql = database();
  const rows = await sql`
    WITH outbox AS (
      INSERT INTO bolet_notification_outbox (order_id)
      SELECT id FROM bolet_orders WHERE idempotency_key = ${idempotencyKey}
      ON CONFLICT (order_id) DO NOTHING
      RETURNING order_id
    )
    SELECT o.id, o.order_number, o.items, o.total_cents, o.pickup_requested,
           o.customer_name, o.customer_phone, n.status AS notification_status
    FROM bolet_orders o
    JOIN bolet_notification_outbox n ON n.order_id = o.id
    WHERE o.idempotency_key = ${idempotencyKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getNotification(orderId) {
  const sql = database();
  const rows = await sql`
    SELECT o.id, o.order_number, o.source, o.items, o.total_cents,
           o.pickup_requested, o.customer_name, o.customer_phone,
           n.status, n.attempt_count
    FROM bolet_orders o
    JOIN bolet_notification_outbox n ON n.order_id = o.id
    WHERE o.id = ${orderId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listStaffOrders(limit = 100) {
  const sql = database();
  return sql`
    SELECT id, order_number, source, items, total_cents, pickup_requested,
           pickup_status, order_status, customer_name, customer_phone,
           created_at, updated_at
    FROM bolet_orders
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function updateStaffOrderStatus({ orderId, expectedStatus, nextStatus }) {
  const sql = database();
  const rows = await sql`
    UPDATE bolet_orders
    SET order_status = ${nextStatus}, updated_at = now()
    WHERE id = ${orderId}::uuid AND order_status = ${expectedStatus}
    RETURNING id, order_number, order_status, updated_at
  `;
  return rows[0] ?? null;
}

export async function claimNotification(orderId) {
  const sql = database();
  const rows = await sql`
    UPDATE bolet_notification_outbox
    SET status = 'sending', attempt_count = attempt_count + 1,
        lease_until = now() + interval '90 seconds', last_error = NULL
    WHERE order_id = ${orderId}::uuid AND status <> 'sent'
      AND next_attempt_at <= now()
      AND (status <> 'sending' OR lease_until IS NULL OR lease_until < now())
    RETURNING attempt_count
  `;
  return rows[0] ?? null;
}

export async function markNotificationSent(orderId, messageId) {
  const sql = database();
  await sql`
    UPDATE bolet_notification_outbox
    SET status = 'sent', sent_at = now(), lease_until = NULL,
        last_error = NULL, telegram_message_id = ${messageId}
    WHERE order_id = ${orderId}::uuid
  `;
}

export async function markNotificationFailed(orderId, errorText, attemptCount) {
  const sql = database();
  const backoffMinutes = Math.min(60, 2 ** Math.min(attemptCount, 6));
  await sql`
    UPDATE bolet_notification_outbox
    SET status = 'pending', lease_until = NULL,
        next_attempt_at = now() + (${backoffMinutes} * interval '1 minute'),
        last_error = ${errorText.slice(0, 500)}
    WHERE order_id = ${orderId}::uuid AND status <> 'sent'
  `;
}

export async function listRetryableNotifications(limit = 10) {
  const sql = database();
  return sql`
    SELECT order_id FROM bolet_notification_outbox
    WHERE (status = 'pending' AND next_attempt_at <= now())
       OR (status = 'sending' AND lease_until < now())
    ORDER BY next_attempt_at ASC
    LIMIT ${limit}
  `;
}

export async function deleteExpiredRecords(retentionDays) {
  const sql = database();
  const rows = await sql`
    WITH expired_drafts AS (
      DELETE FROM bolet_order_drafts WHERE expires_at < now() RETURNING id
    ),
    expired_orders AS (
      DELETE FROM bolet_orders
      WHERE created_at < now() - (${retentionDays} * interval '1 day')
      RETURNING id
    )
    SELECT (SELECT count(*) FROM expired_drafts)::integer AS deleted_drafts,
           (SELECT count(*) FROM expired_orders)::integer AS deleted_orders
  `;
  return rows[0] ?? { deleted_drafts: 0, deleted_orders: 0 };
}
