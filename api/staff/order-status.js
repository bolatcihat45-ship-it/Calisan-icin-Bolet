import { updateStaffOrderStatus } from "../_lib/order-store.js";
import { staffAuthorized, staffDatabaseReady } from "../_lib/staff-auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const transitions = {
  new: new Set(["accepted", "cancelled"]),
  accepted: new Set(["preparing", "cancelled"]),
  preparing: new Set(["ready", "cancelled"]),
  ready: new Set(["completed"]),
  completed: new Set(),
  cancelled: new Set()
};

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!staffAuthorized(request)) return response.status(401).json({ error: "Mitarbeiterzugriff nicht freigeschaltet." });
  if (!staffDatabaseReady()) return response.status(503).json({ error: "Bestellspeicher ist noch nicht eingerichtet." });

  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["orderId", "currentStatus", "nextStatus"].includes(key))) {
    return response.status(400).json({ error: "Ungültige Statusdaten." });
  }
  if (!UUID.test(body.orderId || "") || !transitions[body.currentStatus]?.has(body.nextStatus)) {
    return response.status(400).json({ error: "Dieser Statuswechsel ist nicht erlaubt." });
  }

  try {
    const updated = await updateStaffOrderStatus({ orderId: body.orderId, expectedStatus: body.currentStatus, nextStatus: body.nextStatus });
    if (!updated) return response.status(409).json({ error: "Bestellung wurde zwischenzeitlich geändert. Bitte aktualisieren." });
    return response.status(200).json({ order: { id: updated.id, orderNumber: String(updated.order_number).padStart(6, "0"), status: updated.order_status, updatedAt: updated.updated_at } });
  } catch (error) {
    console.error("BOLET staff status update failed", { error: String(error?.message || "update failed").slice(0, 200) });
    return response.status(503).json({ error: "Status konnte nicht gespeichert werden." });
  }
}
