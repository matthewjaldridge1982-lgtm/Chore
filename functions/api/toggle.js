import {
  isValidDate,
  isValidPerson,
  isValidChore,
  errorResponse,
  json,
  rateLimited,
} from "../_shared/helpers.js";

// POST /api/toggle  body: {date, person_id, chore_id} -> {done: true|false}
//
// The completion id is deterministic (`${date}|${person_id}|${chore_id}`),
// so toggling is idempotent: an accidental double-tap either inserts the
// same row twice (harmless, INSERT OR IGNORE no-ops the second time) or
// deletes a row that's already gone (harmless, DELETE matches zero rows).
// The server decides done/not-done based on whether the row exists *before*
// the request, not on anything the client claims.
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

  const { date, person_id, chore_id } = body ?? {};

  if (!isValidDate(date)) return errorResponse("Invalid 'date'.", 400);
  if (!isValidPerson(person_id)) return errorResponse("Unknown 'person_id'.", 400);
  if (!isValidChore(chore_id)) return errorResponse("Unknown 'chore_id'.", 400);

  const id = `${date}|${person_id}|${chore_id}`;

  const existing = await env.DB.prepare("SELECT id FROM completions WHERE id = ?")
    .bind(id)
    .first();

  if (existing) {
    await env.DB.prepare("DELETE FROM completions WHERE id = ?").bind(id).run();
    return json({ done: false });
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO completions (id, date, person_id, chore_id, done_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, date, person_id, chore_id, new Date().toISOString())
    .run();

  return json({ done: true });
}
