# Family Chores

A four-person family chore tracker. Everyone (two kids sharing an iPad, two
adults each on their own phone) ticks off a daily chore list that syncs
across devices within about 20 seconds, and can log free-text "extras" —
things they did that weren't on the list. There are no accounts, no
passwords, no points, no streaks, and no notifications — just today's list,
a progress bar, and a family overview. It's built with plain HTML/CSS/JS (no
build step) on Cloudflare Pages, Pages Functions, and D1.

> **A note on the setup commands below:** outbound access to
> `developers.cloudflare.com` was blocked in the environment this was built
> in, so the exact `wrangler` commands and `wrangler.toml` fields below were
> verified directly against the installed CLI's own `--help` output
> (`wrangler` v4.127.1, checked 2026-08-29) rather than the docs site. That's
> a solid source — it's the real, current CLI — but if your installed
> `wrangler` behaves very differently, run `npx wrangler d1 --help` and
> `npx wrangler pages --help` yourself and adjust the commands below
> accordingly, and double-check against
> [developers.cloudflare.com](https://developers.cloudflare.com) if you can
> reach it.

## Setup from zero

You'll need a free Cloudflare account and Node.js installed. All commands
run from the repo root; `npx wrangler` will prompt you to log in the first
time it needs to talk to your Cloudflare account.

**1. Create the D1 database:**

```sh
npx wrangler d1 create chore-tracker
```

This prints a `[[d1_databases]]` block containing the real `database_id`.
Copy that `database_id` into `wrangler.toml`, replacing the
`REPLACE_WITH_YOUR_D1_DATABASE_ID` placeholder.

**2. Apply the schema** (creates the `completions` and `extras` tables):

```sh
npx wrangler d1 migrations apply chore-tracker --remote
```

(Use `--local` instead of `--remote` for local development — see below.)

**3. Create the Pages project:**

```sh
npx wrangler pages project create chore-tracker
```

**4. Bind the D1 database to the Pages project**, so `functions/api/*.js` can
reach it as `env.DB`. As of this wrangler version, Pages projects read their
bindings straight from `wrangler.toml` (the `[[d1_databases]]` block already
in this repo) when you deploy with `wrangler pages deploy` — no separate
dashboard step should be required. If your Cloudflare dashboard shows the
binding as missing after deploying, add it manually under **Pages → your
project → Settings → Functions → D1 database bindings** (binding name `DB`,
pointing at the `chore-tracker` database).

**5. Deploy:**

```sh
npx wrangler pages deploy public
```

**Local development**, once the database exists:

```sh
npx wrangler d1 execute chore-tracker --local --file=./schema.sql
npx wrangler pages dev public
```

`wrangler pages dev` serves `public/` and `functions/` together on
`http://localhost:8788` and reads the D1 binding from `wrangler.toml`
automatically, running against a local SQLite-backed copy of D1 (no
Cloudflare account calls, no cost). Test the API directly, e.g.:

```sh
curl "http://localhost:8788/api/day?date=2026-08-29"
curl -X POST -H "content-type: application/json" \
  -d '{"date":"2026-08-29","person_id":"p1","chore_id":"c1"}' \
  http://localhost:8788/api/toggle
```

## Adding or removing a person or chore

Everything about people and chores lives in **`public/config.js`** — nothing
is stored in the database or editable from the UI. Open that file; there's a
comment block at the top with the full rules, summarised here:

- **Add a person:** add an entry to the `PEOPLE` array with a new, never-reused
  `id`, a `name`, an `emoji`, and a hex `colour`. Then add their chores to
  `CHORES` (see below). Redeploy — no other file needs to change, and the
  layout automatically flexes to fit anywhere from 3 to 6 people.
- **Remove a person:** delete their entry from `PEOPLE` (and, if you like,
  their chores from `CHORES` — leftover rows are simply ignored). Redeploy.
- **Add/change a chore:** add or edit an entry in `CHORES`. Each needs an
  `id` (unique across *all* chores, never reused), the owning `person` id, a
  short `label`, an `emoji`, and `days` — either `"daily"` or an array of
  weekday numbers (`0` = Sunday … `6` = Saturday).
- **Remove a chore:** delete its entry from `CHORES`. Redeploy.

## Installing on iOS

1. Open the deployed URL in **Safari** (not Chrome — Add to Home Screen only
   works from Safari on iOS).
2. Tap the **Share** icon, then **Add to Home Screen**.
3. Open it from the Home Screen icon — it launches full-screen, with no
   Safari address bar, and the bottom navigation bar sits clear of the home
   indicator.

The app shows a small dismissible one-line hint about this automatically
when it detects it's running in iOS Safari (not already installed).

## Security — please read

**There is no authentication.** Anyone who has the URL can read and write
every family member's chores and extras. The only protection is that the
Cloudflare Pages URL (or whatever custom subdomain you put in front of it)
is unguessable if you don't share it publicly. This is a deliberate
trade-off: a four-person family chore app where a 7-year-old has to use it
unassisted cannot have a login screen. Do not add authentication — if you
need it, this app is the wrong starting point.

Basic abuse hygiene that *is* in place:

- Extras are capped at 200 characters, enforced on the server (not just the
  client) — see `functions/api/extra.js`.
- `person_id` and `chore_id` are validated against an allow-list derived
  from `public/config.js` on every request — unknown ids are rejected with
  a 400, never silently written.
- `date` values are validated as `YYYY-MM-DD` and must fall within a small
  window of the server's real UTC date, so the API can't be used to write
  arbitrary historical or future rows.
- A minimal in-memory per-IP rate limit (30 requests / 10 seconds) is
  applied to the write endpoints (`functions/_shared/helpers.js`). It's a
  speed bump, not a security boundary — Workers isolates can restart at any
  time, resetting it — but it costs under 20 lines and stops a runaway
  double-tap loop or a broken client from hammering the database.

## Bumping the service worker cache

`public/sw.js` caches the app shell (HTML/CSS/JS/icons) under a versioned
cache name. Whenever you change **any** file in `public/` other than the
API responses themselves, bump `CACHE_VERSION` at the top of `public/sw.js`
(e.g. `"v1"` → `"v2"`) and redeploy. The old cache is deleted automatically
once the new service worker activates. If you forget to bump it, installed
PWAs may keep serving stale shell files indefinitely (API calls are always
network-first regardless, so data itself never goes stale — only the shell
can).
