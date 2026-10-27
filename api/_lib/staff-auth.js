import { secretMatches } from "./config.js";

export function staffAuthorized(request) {
  const token = process.env.STAFF_DASHBOARD_TOKEN;
  if (!token || token.length < 32) return false;
  const origin = request.headers?.origin;
  if (!process.env.SITE_ORIGIN || (origin && origin !== process.env.SITE_ORIGIN)) return false;
  if (request.method !== "GET" && origin !== process.env.SITE_ORIGIN) return false;
  return secretMatches(request.headers?.authorization, token);
}

export function staffDatabaseReady() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_SCHEMA_READY === "true");
}
