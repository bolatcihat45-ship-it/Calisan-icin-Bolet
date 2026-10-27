import { timingSafeEqual } from "node:crypto";

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function notificationConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function channelConfigured(channel) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_SCHEMA_READY !== "true" || !notificationConfigured() || process.env.TELEGRAM_TESTED !== "true" || process.env.PRIVACY_NOTICE_UPDATED !== "true" || process.env.ORDER_RETENTION_REVIEWED !== "true" || process.env.MENU_VERIFIED !== "true" || !validRetentionDays() || process.env.ORDERS_ENABLED !== "true") return false;
  if (channel === "phone") return process.env.VOICE_ORDERS_ENABLED === "true" && Boolean(process.env.VAPI_WEBHOOK_TOKEN) && process.env.VAPI_PHONE_ROUTE_VERIFIED === "true";
  if (channel === "website") return process.env.WEBSITE_ORDERS_ENABLED === "true" && Boolean(process.env.SITE_ORIGIN);
  return false;
}

export function validRetentionDays() {
  const days = Number(process.env.ORDER_RETENTION_DAYS);
  return Number.isInteger(days) && days >= 1 && days <= 36500;
}

export function getPublicStatus() {
  return {
    orders: {
      phone: channelConfigured("phone"),
      website: channelConfigured("website")
    },
    notifications: notificationConfigured(),
    database: hasDatabase(),
    preflight: {
      databaseSchema: process.env.DATABASE_SCHEMA_READY === "true",
      telegramTested: process.env.TELEGRAM_TESTED === "true",
      privacyNoticeUpdated: process.env.PRIVACY_NOTICE_UPDATED === "true",
      orderRetentionReviewed: process.env.ORDER_RETENTION_REVIEWED === "true",
      menuVerified: process.env.MENU_VERIFIED === "true",
      orderRetentionDays: validRetentionDays() ? Number(process.env.ORDER_RETENTION_DAYS) : null,
      phoneRouteVerified: process.env.VAPI_PHONE_ROUTE_VERIFIED === "true"
    }
  };
}

export function secretMatches(headerValue, expectedSecret, scheme = "Bearer") {
  if (!expectedSecret || typeof headerValue !== "string") return false;
  let received = headerValue;
  if (scheme) {
    const match = headerValue.match(new RegExp(`^${scheme}\\s+(.+)$`, "i"));
    if (!match) return false;
    received = match[1];
  }
  const left = Buffer.from(received);
  const right = Buffer.from(expectedSecret);
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}
