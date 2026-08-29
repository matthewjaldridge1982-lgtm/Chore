// Shared helpers for the API functions. Imports the SAME config.js used by
// the frontend (public/config.js) so people/chore ids are validated against
// one source of truth — never duplicated here.
import { PEOPLE, CHORES } from "../../public/config.js";

export const PERSON_IDS = new Set(PEOPLE.map((p) => p.id));
export const CHORE_IDS = new Set(CHORES.map((c) => c.id));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validates a YYYY-MM-DD date string sent by the client. The server never
// derives "today" from its own clock (Workers run in UTC, which drifts from
// Melbourne local time by up to 11 hours) — it only checks the client's
// claimed date is well-formed and plausible.
export function isValidDate(date) {
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const asUTC = Date.UTC(y, m - 1, d);
  if (Number.isNaN(asUTC)) return false;
  // Round-trip check: rejects e.g. 2026-02-31 (JS Date would roll it to March).
  const check = new Date(asUTC);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return false;
  }
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  return Math.abs(asUTC - nowMs) <= twoDaysMs + 24 * 60 * 60 * 1000;
  // (extra +24h slack absorbs the gap between a UTC day boundary and a
  // Melbourne day boundary; still tightly bounded, not a real clock check)
}

export function isValidPerson(id) {
  return typeof id === "string" && PERSON_IDS.has(id);
}

export function isValidChore(id) {
  return typeof id === "string" && CHORE_IDS.has(id);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(message, status = 400) {
  return json({ error: message }, status);
}

// Minimal per-IP rate limit using a Durable-Object-free, in-memory token
// bucket. Workers can spin up fresh isolates at any time, so this is a
// best-effort speed bump against accidental hammering (e.g. a runaway
// double-tap loop), not a security boundary.
const buckets = new Map();
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 30;

export function rateLimited(request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}
