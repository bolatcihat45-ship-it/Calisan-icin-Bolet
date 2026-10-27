import { formatPrice } from "../_lib/order-domain.js";
import { listStaffOrders } from "../_lib/order-store.js";
import { staffAuthorized, staffDatabaseReady } from "../_lib/staff-auth.js";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  if (!staffAuthorized(request)) return response.status(401).json({ error: "Mitarbeiterzugriff nicht freigeschaltet." });
  if (!staffDatabaseReady()) return response.status(503).json({ error: "Bestellspeicher ist noch nicht eingerichtet." });

  try {
    const orders = await listStaffOrders(100);
    return response.status(200).json({ orders: orders.map((order) => ({
      id: order.id,
      orderNumber: String(order.order_number).padStart(6, "0"),
      source: order.source,
      items: order.items,
      total: formatPrice(Number(order.total_cents)),
      pickupRequested: order.pickup_requested,
      pickupStatus: order.pickup_status,
      status: order.order_status,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    })) });
  } catch (error) {
    console.error("BOLET staff orders unavailable", { error: String(error?.message || "query failed").slice(0, 200) });
    return response.status(503).json({ error: "Bestellungen konnten nicht geladen werden. Datenbankschema prüfen." });
  }
}
