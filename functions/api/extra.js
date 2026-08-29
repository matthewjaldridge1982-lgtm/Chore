import {
  isValidDate,
  isValidPerson,
  errorResponse,
  json,
  rateLimited,
} from "../_shared/helpers.js";

const MAX_LEN = 200;

// POST /api/extra  body: {date, person_id, text} -> {id}
export async function onRequestPost({ request, env }) {
  if (rateLimited(request)) {
    return errorResponse("Too many requests, slow down.", 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const { date, person_id, text } = body ?? {};

  if (!isValidDate(date)) return errorResponse("Invalid 'date'.", 400);
  if (!isValidPerson(person_id)) return errorResponse("Unknown 'person_id'.", 400);

  if (typeof text !== "string") return errorResponse("'text' must be a string.", 400);
  const trimmed = text.trim();
  if (trimmed.length === 0) return errorResponse("'text' must not be empty.", 400);
  if (trimmed.length > MAX_LEN) {
    return errorResponse(`'text' must be ${MAX_LEN} characters or fewer.`, 400);
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO extras (id, date, person_id, text, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, date, person_id, trimmed, new Date().toISOString())
    .run();

  return json({ id }, 201);
}

// DELETE /api/extra  body: {id} -> {ok: true}
export async function onRequestDelete({ request, env }) {
  if (rateLimited(request)) {
    return errorResponse("Too many requests, slow down.", 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const { id } = body ?? {};
  if (typeof id !== "string" || id.length === 0) {
    return errorResponse("Invalid 'id'.", 400);
  }

  await env.DB.prepare("DELETE FROM extras WHERE id = ?").bind(id).run();

  return json({ ok: true });
}
