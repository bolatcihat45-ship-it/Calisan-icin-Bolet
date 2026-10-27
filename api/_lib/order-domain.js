import { menuProducts, formatPrice } from "../../menu-data.js";

const orderableProducts = new Map(menuProducts.filter((product) => !product.approximate).map((product) => [product.id, product]));
const affirmativeConfirmations = new Set([
  "ja", "ja bitte", "genau", "ja genau", "ja das ist richtig", "das ist richtig", "ja das stimmt", "das stimmt", "richtig", "ja richtig", "stimmt", "stimmt so", "ja stimmt so", "ich bestatige", "ja das ist korrekt", "das passt", "ja das passt", "ja passt", "passt", "passt so", "ja passt so",
  "evet", "evet lutfen", "dogru", "evet dogru", "bu dogru", "evet bu dogru", "aynen", "onayliyorum", "evet onayliyorum", "tamam", "tamamdir"
]);

export function normalizeConfirmationText(text) {
  if (typeof text !== "string") return "";
  return text.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("de-AT").replaceAll("ı", "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function isExplicitConfirmation(text) {
  return affirmativeConfirmations.has(normalizeConfirmationText(text));
}

export function normalizeOptionalName(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Name ist ungültig.");
  const name = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!name || name.length > 80) throw new Error("Name darf höchstens 80 Zeichen haben.");
  return name;
}

export function normalizeOptionalPhone(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Telefonnummer ist ungültig.");
  const phone = value.replace(/[\r\n\t]+/g, " ").trim();
  if (phone.length > 30 || !/^[+0-9() .\-/]+$/.test(phone) || phone.replace(/\D/g, "").length < 5) {
    throw new Error("Telefonnummer ist ungültig.");
  }
  return phone;
}

export function normalizeOrderNote(value) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new Error("Bestellnotiz ist ungültig.");
  const note = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (note.length > 240) throw new Error("Bestellnotiz darf höchstens 240 Zeichen haben.");
  return note;
}

export function validatePickupRequest(value) {
  if (typeof value !== "string") throw new Error("Bitte gewünschte Abholzeit angeben.");
  const pickup = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!pickup || pickup.length > 100) throw new Error("Gewünschte Abholzeit ist ungültig.");
  if (/\b(liefer\w*|zustellung|deliver\w*|delivery|shipping|courier|teslim\w*|kurye|kargo\w*|adrese)\b/i.test(pickup)) {
    throw new Error("BOLET bietet nur Selbstabholung an. Bitte nennen Sie die gewünschte Abholzeit.");
  }
  return pickup;
}

export function calculateOrder(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new Error("Bitte 1 bis 20 Menüpositionen angeben.");
  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Menüposition ist ungültig.");
    if (Object.keys(item).some((key) => !["productId", "id", "quantity", "notes"].includes(key))) throw new Error("Unbekannte Produktdaten.");
    const productId = item.productId ?? item.id;
    const quantity = item.quantity;
    if (typeof productId !== "string" || !orderableProducts.has(productId)) {
      if (productId === "schnitzel") throw new Error("Der Schnitzelpreis ist nur ungefähr angegeben und muss zuerst vom Geschäft bestätigt werden.");
      throw new Error("Dieses Produkt ist nicht in der bestätigten Bestellkarte.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("Die Menge muss zwischen 1 und 20 liegen.");
    const notes = normalizeOrderNote(item.notes);
    const lineKey = `${productId}\u0000${notes}`;
    const previous = quantities.get(lineKey);
    quantities.set(lineKey, { productId, quantity: (previous?.quantity ?? 0) + quantity, notes });
  }
  if (quantities.size > 20 || [...quantities.values()].some(({ quantity }) => quantity > 20)) throw new Error("Bestellmenge überschreitet das erlaubte Limit.");

  const lines = [...quantities.values()].map(({ productId, quantity, notes }) => {
    const product = orderableProducts.get(productId);
    return {
      productId,
      name: product.name,
      quantity,
      ...(notes ? { notes } : {}),
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * quantity
    };
  });
  return { items: lines, totalCents: lines.reduce((sum, item) => sum + item.lineTotalCents, 0) };
}

export function publicMenu() {
  return {
    currency: "EUR",
    orderableProducts: menuProducts.filter((product) => !product.approximate).map((product) => ({
      id: product.id,
      name: product.name,
      german: product.german,
      priceCents: product.priceCents,
      price: formatPrice(product.priceCents)
    })),
    notOrderable: menuProducts.filter((product) => product.approximate).map((product) => ({
      name: product.name,
      reason: "Preis nicht bestätigt; keine automatische Preiszusage möglich."
    }))
  };
}

export function displayOrder(order) {
  return {
    orderNumber: String(order.order_number).padStart(6, "0"),
    items: order.items,
    totalCents: Number(order.total_cents),
    total: formatPrice(Number(order.total_cents)),
    pickupRequested: order.pickup_requested,
    pickupStatus: "awaiting_shop_confirmation",
    notificationStatus: order.notification_status === "sent" ? "accepted_by_telegram" : "pending"
  };
}

export { formatPrice };
