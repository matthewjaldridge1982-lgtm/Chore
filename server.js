// Local family server — plain Node.js, zero npm dependencies.
//
// Run this on the always-on household device (e.g. the Windows Surface Go).
// It serves the app AND the API from one process, storing data in a local
// JSON file instead of a cloud database. Every device on the same Wi-Fi
// (kids' iPad, parents' phones) opens the same LAN address and stays in
// sync via the app's normal polling.
//
// Start it with:   node server.js
// or double-click:  start.bat   (Windows)
//
// See README.md → "Running on a local Windows device" for full setup.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PEOPLE } from "./public/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const PORT = Number(process.env.PORT) || 3000;

const PERSON_IDS = new Set(PEOPLE.map((p) => p.id));

// Chores now live in the database (edited via /admin.html), not config.js —
// this is only the one-time seed used the very first time the server runs
// against an empty store, so existing installs keep the same starter set
// and ids (any completions already ticked against these ids stay valid).
const DEFAULT_CHORES = [
  { id: "c1", person_id: "p1", label: "Make bed", emoji: "🛏️", days: [1, 2, 3, 4, 5] },
  { id: "c2", person_id: "p1", label: "Feed the cat", emoji: "🐱", days: [1, 2, 3, 4, 5] },
  { id: "c3", person_id: "p1", label: "Pack school bag", emoji: "🎒", days: [1, 2, 3, 4, 5] },
  { id: "c4", person_id: "p1", label: "Toys away", emoji: "🧸", days: [1, 2, 3, 4, 5] },
  { id: "c5", person_id: "p2", label: "Make bed", emoji: "🛏️", days: [1, 2, 3, 4, 5] },
  { id: "c6", person_id: "p2", label: "Empty dishwasher", emoji: "🍽️", days: [1, 3, 5] },
  { id: "c7", person_id: "p2", label: "Take out bins", emoji: "🗑️", days: [2, 5] },
  { id: "c8", person_id: "p2", label: "Practice reading", emoji: "📖", days: [1, 2, 3, 4, 5] },
];

// ============================================================================
// Tiny JSON "database" — loaded once into memory, persisted after every
// write. Writes are serialised through `writeQueue` so two near-simultaneous
// requests (e.g. a double-tap from two devices) can't corrupt the file by
// interleaving writes, and the file is written via a temp-file-then-rename
// so a crash mid-write never leaves a half-written store.json behind.
// ============================================================================

/** @type {{ completions: Record<string, object>, extras: Record<string, object>, chores?: Record<string, object> }} */
let db = { completions: {}, extras: {} }; // chores is intentionally absent — see loadDb()
let writeQueue = Promise.resolve();

async function loadDb() {
  await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(await readFile(DATA_FILE, "utf8"));
    } catch (err) {
      console.error(`Could not read ${DATA_FILE} (${err.message}) — starting with an empty store.`);
    }
  }
  db.completions ||= {};
  db.extras ||= {};
  // Seed only if `chores` has never existed in the store — NOT just if it's
  // empty, since deleting every chore via /admin is a valid end state that
  // must not get silently repopulated with the defaults on next restart.
  if (db.chores === undefined) {
    db.chores = Object.fromEntries(DEFAULT_CHORES.map((c) => [c.id, c]));
    await persistDb();
  }
}

function persistDb() {
  writeQueue = writeQueue.then(async () => {
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(db));
    await rename(tmp, DATA_FILE);
  });
  return writeQueue;
}

// ============================================================================
// Validation (same rules as the Cloudflare version's functions/_shared/helpers.js)
// ============================================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(date) {
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const asUTC = Date.UTC(y, m - 1, d);
  if (Number.isNaN(asUTC)) return false;
  const check = new Date(asUTC);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return false;
  }
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  return Math.abs(asUTC - Date.now()) <= twoDaysMs + 24 * 60 * 60 * 1000;
}

const isValidPerson = (id) => typeof id === "string" && PERSON_IDS.has(id);
const isValidChore = (id) => typeof id === "string" && Object.hasOwn(db.chores, id);

const MAX_LABEL_LEN = 60;
const MAX_EMOJI_LEN = 8; // generous — covers multi-codepoint emoji (ZWJ sequences, skin tones)

function isValidLabel(label) {
  return typeof label === "string" && label.trim().length > 0 && label.trim().length <= MAX_LABEL_LEN;
}

function isValidEmoji(emoji) {
  return typeof emoji === "string" && emoji.trim().length > 0 && emoji.length <= MAX_EMOJI_LEN;
}

function isValidDays(days) {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    days.length <= 7 &&
    days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    new Set(days).size === days.length
  );
}

// Minimal per-IP rate limit — a speed bump against a runaway client, not a
// security boundary (this server only needs to survive your own household).
const buckets = new Map();
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 60;
function rateLimited(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

// ============================================================================
// HTTP helpers
// ============================================================================

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

async function serveStatic(req, res, urlPath) {
  let relPath = urlPath === "/" ? "/index.html" : urlPath;
  relPath = decodeURIComponent(relPath.split("?")[0]);

  const filePath = path.normalize(path.join(PUBLIC_DIR, relPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendError(res, 400, "Bad path.");
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
}

// ============================================================================
// API handlers — same contract as the Cloudflare Pages Functions version
// (functions/api/*.js): GET /api/day, GET /api/week, POST /api/toggle,
// POST /api/extra, DELETE /api/extra.
// ============================================================================

function handleGetDay(req, res, query) {
  const date = query.get("date");
  if (!isValidDate(date)) return sendError(res, 400, "Invalid or missing 'date' query param.");

  const completions = Object.values(db.completions)
    .filter((c) => c.date === date)
    .map((c) => ({ person_id: c.person_id, chore_id: c.chore_id }));
  const extras = Object.values(db.extras)
    .filter((e) => e.date === date)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => ({ id: e.id, person_id: e.person_id, text: e.text }));

  sendJson(res, 200, { completions, extras });
}

function handleGetWeek(req, res, query) {
  const end = query.get("end");
  if (!isValidDate(end)) return sendError(res, 400, "Invalid or missing 'end' query param.");

  const [y, m, d] = end.split("-").map(Number);
  const dates = [];
  for (let offset = 6; offset >= 0; offset--) {
    dates.push(new Date(Date.UTC(y, m - 1, d - offset)).toISOString().slice(0, 10));
  }
  const start = dates[0];

  const completions = Object.values(db.completions)
    .filter((c) => c.date >= start && c.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({ date: c.date, person_id: c.person_id, chore_id: c.chore_id }));
  const extras = Object.values(db.extras)
    .filter((e) => e.date >= start && e.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((e) => ({ id: e.id, date: e.date, person_id: e.person_id, text: e.text }));

  sendJson(res, 200, { dates, completions, extras });
}

async function handleToggle(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }
  const { date, person_id, chore_id } = body ?? {};
  if (!isValidDate(date)) return sendError(res, 400, "Invalid 'date'.");
  if (!isValidPerson(person_id)) return sendError(res, 400, "Unknown 'person_id'.");
  if (!isValidChore(chore_id)) return sendError(res, 400, "Unknown 'chore_id'.");

  const id = `${date}|${person_id}|${chore_id}`;
  if (db.completions[id]) {
    delete db.completions[id];
    await persistDb();
    return sendJson(res, 200, { done: false });
  }
  db.completions[id] = { id, date, person_id, chore_id, done_at: new Date().toISOString() };
  await persistDb();
  sendJson(res, 200, { done: true });
}

const MAX_EXTRA_LEN = 200;

async function handleAddExtra(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }
  const { date, person_id, text } = body ?? {};
  if (!isValidDate(date)) return sendError(res, 400, "Invalid 'date'.");
  if (!isValidPerson(person_id)) return sendError(res, 400, "Unknown 'person_id'.");
  if (typeof text !== "string") return sendError(res, 400, "'text' must be a string.");

  const trimmed = text.trim();
  if (trimmed.length === 0) return sendError(res, 400, "'text' must not be empty.");
  if (trimmed.length > MAX_EXTRA_LEN) {
    return sendError(res, 400, `'text' must be ${MAX_EXTRA_LEN} characters or fewer.`);
  }

  const id = randomUUID();
  db.extras[id] = { id, date, person_id, text: trimmed, created_at: new Date().toISOString() };
  await persistDb();
  sendJson(res, 201, { id });
}

async function handleDeleteExtra(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }
  const { id } = body ?? {};
  if (typeof id !== "string" || id.length === 0) return sendError(res, 400, "Invalid 'id'.");

  delete db.extras[id];
  await persistDb();
  sendJson(res, 200, { ok: true });
}

// ============================================================================
// Chores — managed live from /admin.html rather than config.js. Deleting a
// chore doesn't touch any completions already recorded against its id; they
// simply stop being shown (the day/week/star logic only ever looks at
// chores that currently exist).
// ============================================================================

function handleGetChores(req, res) {
  const chores = Object.values(db.chores).map((c) => ({
    id: c.id,
    person_id: c.person_id,
    label: c.label,
    emoji: c.emoji,
    days: c.days,
  }));
  sendJson(res, 200, { chores });
}

async function handleCreateChore(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }
  const { person_id, label, emoji, days } = body ?? {};
  if (!isValidPerson(person_id)) return sendError(res, 400, "Unknown 'person_id'.");
  if (!isValidLabel(label)) return sendError(res, 400, `'label' must be 1–${MAX_LABEL_LEN} characters.`);
  if (!isValidEmoji(emoji)) return sendError(res, 400, "'emoji' must not be empty.");
  if (!isValidDays(days)) return sendError(res, 400, "'days' must be a non-empty array of unique weekday numbers 0–6.");

  const id = randomUUID();
  db.chores[id] = { id, person_id, label: label.trim(), emoji, days };
  await persistDb();
  sendJson(res, 201, { id });
}

async function handleUpdateChore(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }
  const { id, person_id, label, days } = body ?? {};
  if (typeof id !== "string" || !db.chores[id]) return sendError(res, 400, "Unknown chore 'id'.");
  if (person_id !== undefined && !isValidPerson(person_id)) return sendError(res, 400, "Unknown 'person_id'.");
  if (label !== undefined && !isValidLabel(label)) {
    return sendError(res, 400, `'label' must be 1–${MAX_LABEL_LEN} characters.`);
  }
  if (days !== undefined && !isValidDays(days)) {
    return sendError(res, 400, "'days' must be a non-empty array of unique weekday numbers 0–6.");
  }

  if (person_id !== undefined) db.chores[id].person_id = person_id;
  if (label !== undefined) db.chores[id].label = label.trim();
  if (days !== undefined) db.chores[id].days = days;
  await persistDb();
  sendJson(res, 200, { ok: true });
}

async function handleDeleteChore(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }
  const { id } = body ?? {};
  if (typeof id !== "string" || id.length === 0) return sendError(res, 400, "Invalid 'id'.");

  delete db.chores[id];
  await persistDb();
  sendJson(res, 200, { ok: true });
}

// ============================================================================
// Router
// ============================================================================

const server = createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || "unknown";
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      const isWrite = req.method === "POST" || req.method === "DELETE";
      if (isWrite && rateLimited(ip)) return sendError(res, 429, "Too many requests, slow down.");

      if (url.pathname === "/api/day" && req.method === "GET") return handleGetDay(req, res, url.searchParams);
      if (url.pathname === "/api/week" && req.method === "GET") return handleGetWeek(req, res, url.searchParams);
      if (url.pathname === "/api/toggle" && req.method === "POST") return await handleToggle(req, res);
      if (url.pathname === "/api/extra" && req.method === "POST") return await handleAddExtra(req, res);
      if (url.pathname === "/api/extra" && req.method === "DELETE") return await handleDeleteExtra(req, res);
      if (url.pathname === "/api/chores" && req.method === "GET") return handleGetChores(req, res);
      if (url.pathname === "/api/chores" && req.method === "POST") return await handleCreateChore(req, res);
      if (url.pathname === "/api/chores" && req.method === "PATCH") return await handleUpdateChore(req, res);
      if (url.pathname === "/api/chores" && req.method === "DELETE") return await handleDeleteChore(req, res);

      return sendError(res, 404, "Unknown API route.");
    }

    await serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error(err);
    sendError(res, 500, "Internal server error.");
  }
});

function lanAddresses() {
  const addrs = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces || []) {
      if (iface.family === "IPv4" && !iface.internal) addrs.push(iface.address);
    }
  }
  return addrs;
}

await loadDb();
server.listen(PORT, "0.0.0.0", () => {
  console.log("\nFamily Chores is running.\n");
  console.log(`  On this device:   http://localhost:${PORT}`);
  for (const addr of lanAddresses()) {
    console.log(`  On other devices: http://${addr}:${PORT}`);
  }
  console.log("\n(Everyone must be on the same Wi-Fi/network as this device.)");
  console.log("Press Ctrl+C to stop.\n");
});
