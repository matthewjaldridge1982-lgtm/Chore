import { isValidDate, errorResponse, json } from "../_shared/helpers.js";

// GET /api/week?end=YYYY-MM-DD
// Returns completions and extras for the 7 calendar days ending on (and
// including) `end`, for the Family view's 7-day grid.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const end = url.searchParams.get("end");

  if (!isValidDate(end)) {
    return errorResponse("Invalid or missing 'end' query param (expected YYYY-MM-DD).", 400);
  }

  const [y, m, d] = end.split("-").map(Number);
  const dates = [];
  for (let offset = 6; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(y, m - 1, d - offset));
    dates.push(dt.toISOString().slice(0, 10));
  }
  const startDate = dates[0];

  const [completionsResult, extrasResult] = await Promise.all([
    env.DB.prepare(
      "SELECT date, person_id, chore_id FROM completions WHERE date >= ? AND date <= ? ORDER BY date ASC"
    )
      .bind(startDate, end)
      .all(),
    env.DB.prepare(
      "SELECT id, date, person_id, text FROM extras WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC"
    )
      .bind(startDate, end)
      .all(),
  ]);

  return json({
    dates,
    completions: completionsResult.results,
    extras: extrasResult.results,
  });
}
