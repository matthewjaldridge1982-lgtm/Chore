import { isValidDate, errorResponse, json } from "../_shared/helpers.js";

// GET /api/day?date=YYYY-MM-DD
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!isValidDate(date)) {
    return errorResponse("Invalid or missing 'date' query param (expected YYYY-MM-DD).", 400);
  }

  const [completionsResult, extrasResult] = await Promise.all([
    env.DB.prepare("SELECT person_id, chore_id FROM completions WHERE date = ?")
      .bind(date)
      .all(),
    env.DB.prepare("SELECT id, person_id, text FROM extras WHERE date = ? ORDER BY created_at ASC")
      .bind(date)
      .all(),
  ]);

  return json({
    completions: completionsResult.results,
    extras: extrasResult.results,
  });
}
