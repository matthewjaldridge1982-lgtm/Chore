# Family Chores

A four-person family chore tracker: **everyone ticks off their chores on
one shared screen** — a spare Windows device (e.g. a Surface Go) propped up
somewhere central, running full-screen with no browser chrome. Walk up, tap
your name, tick things off, tap "Switch person" for the next person. Can
also log free-text "extras" — things they did that weren't on the list.
There are no accounts, no passwords, and no notifications — just today's
list, a progress bar, and a family overview. Chores run Monday–Friday; a
perfect Mon–Fri week earns a ⭐ next to your name for the weekend (see
"The weekly star" below), clearing at 1am Monday when the new week starts.
The frontend is plain HTML/CSS/JS (no build step, no npm dependencies) —
only the backend differs depending on where you run it:

- **`server.js`** — a plain Node.js server for running it on a device you
  already own. **This is the recommended path.** No cloud account, no URL
  to guard, nothing leaves the house.
- **`functions/` + `wrangler.toml`** — Cloudflare Pages Functions + D1, for
  hosting it on the public internet instead, if everyone has their own
  phone rather than sharing one screen. Kept in this repo as an
  alternative; see the bottom of this file.

Both backends implement the exact same `/api/day`, `/api/toggle`,
`/api/extra`, `/api/week` contract and share the same `public/` frontend —
picking one doesn't change how the app looks or behaves.

## Running it on a shared Windows device (recommended)

This turns a spare Windows 11 machine into a dedicated chore board: it
starts the server and opens the app full-screen automatically, so the
device itself becomes the thing everyone taps, like a household appliance
rather than a computer.

**1. Install Node.js on the device** (one-time). Either:

- Download the **LTS installer** from [nodejs.org](https://nodejs.org) and
  run it, or
- Open PowerShell and run `winget install OpenJS.NodeJS.LTS`

**2. Get this project onto the device** — download it as a ZIP from GitHub
(Code → Download ZIP) and extract it, or `git clone` it if you have Git
installed. Either way, end up with a folder containing `server.js`,
`start-kiosk.bat`, `public/`, etc.

**3. Double-click `start-kiosk.bat`.** It starts the server in the
background, then opens Microsoft Edge full-screen with no address bar, tabs,
or menu, showing the app. That's the whole setup — the screen now shows
"Who's ticking off chores?" and anyone can walk up and tap their name.

The first time it runs, Windows will ask whether to let **Node.js
JavaScript Runtime** communicate on networks — tick **Private networks**
and click **Allow access**. (This only matters if you also want to check
in from a phone occasionally, see below; the kiosk screen itself works
either way since it's talking to itself.)

To get out of the full-screen view (e.g. to edit `config.js`), press
**Alt+F4** to close Edge. The server keeps running in its own minimized
window in the taskbar; leave it running or close that too.

If you'd rather see the server's log output, or Edge isn't available,
double-click **`start.bat`** instead — it starts the server in a normal
console window without launching a kiosk browser, so you can open the app
in any browser tab yourself.

**Keeping it always-on:** a laptop that sleeps drops off and stops
responding to taps. On the device: **Settings → System → Power & sleep** →
set "When plugged in, put my device to sleep after" to **Never**, and (if
it'll run lid-closed) **Control Panel → Power Options → Choose what closing
the lid does** → set to **Do nothing**. Keep it plugged in.

**Starting automatically on boot** (optional, so you don't have to
double-click anything after a reboot): press `Win+R`, type `shell:startup`,
hit Enter — that opens your Startup folder. Right-click `start-kiosk.bat` →
**Show more options → Create shortcut**, then drag that shortcut into the
Startup folder. The device now boots straight into the chore board.

**Where the data lives:** a `data/store.json` file next to `server.js`,
created automatically on first run. That file *is* the database — back it
up like you would any other file you care about (copy it somewhere
occasionally), and don't delete it unless you want to wipe all history.

**Bonus — checking in from a phone:** the server still listens on the
network (not just the kiosk screen itself), so if you're on the same Wi-Fi
you can open `http://<the device's LAN address>:3000` — shown in the
server's console window — from a phone to peek at the family view from the
couch. Entirely optional; the app works fully without ever doing this.

**A note on HTTPS:** the local server is plain HTTP (`http://`, not
`https://`) — setting up a trusted certificate for a home LAN address isn't
worth the hassle here. Everything in the app itself works fine over plain
HTTP. The one thing that doesn't: browsers only allow a page to register a
Service Worker over HTTPS or on `localhost`. The kiosk screen itself loads
from `localhost`, so that's unaffected; only the optional phone bonus above
(loading from a LAN IP) skips the offline app-shell caching in
`public/sw.js` — it quietly works as a normal, non-cached page instead.

## Adding or removing a person or chore

Everything about people and chores lives in **`public/config.js`** —
nothing is stored in the database or editable from the UI. Open that file;
there's a comment block at the top with the full rules, summarised here:

- **Add a person:** add an entry to the `PEOPLE` array with a new, never-reused
  `id`, a `name`, an `emoji`, and a hex `colour`. Then add their chores to
  `CHORES` (see below). No other file needs to change — the layout
  automatically flexes to fit anywhere from 3 to 6 people.
- **Remove a person:** delete their entry from `PEOPLE` (and, if you like,
  their chores from `CHORES` — leftover rows are simply ignored).
- **Add/change a chore:** add or edit an entry in `CHORES`. Each needs an
  `id` (unique across *all* chores, never reused), the owning `person` id, a
  short `label`, an `emoji`, and `days` — either `"daily"` or an array of
  weekday numbers (`0` = Sunday … `6` = Saturday).
- **Remove a chore:** delete its entry from `CHORES`.

After editing, restart the server (close the `start.bat` window and
double-click it again — or if it's running via the Startup folder, just
reboot or re-launch it) so it picks up the change. If you're on the
Cloudflare backend instead, redeploy.

## The weekly star

The starter chores in `config.js` only run Monday–Friday. Whenever someone
ticks off every chore they had that Mon–Fri, a ⭐ appears next to their name
— on the picker screen, in their own header, and in the Family view — for
the rest of the weekend. It's computed live from that week's completions
each time (nothing is stored as "the star" itself), and clears at **1am
Monday**, not midnight, so the tail end of a late Sunday night (or an early
riser before 1am Monday) still sees the weekend state. This is the one
place the app's day boundary isn't ordinary local midnight — every other
day-to-day transition still is.

If you add a chore scheduled on a Saturday or Sunday, it's still fully
usable, it just doesn't count toward the star (only weekdays 1–5 do).

## Installing on iOS

1. Open the app's address in **Safari** (not Chrome — Add to Home Screen
   only works from Safari on iOS).
2. Tap the **Share** icon, then **Add to Home Screen**.
3. Open it from the Home Screen icon — it launches full-screen, with no
   Safari address bar, and the bottom navigation bar sits clear of the home
   indicator.

The app shows a small dismissible one-line hint about this automatically
when it detects it's running in iOS Safari (not already installed).

## Security — please read

**There is no authentication.** Anyone who can reach the server can read
and write every family member's chores and extras. Running it on your own
home Wi-Fi (the recommended local-Windows setup above) is itself the main
safeguard — it's simply not reachable from outside your house. If you
instead deploy the Cloudflare version to the public internet, the only
protection is that the URL is unguessable if you don't share it. Either
way, this is a deliberate trade-off: a four-person family chore app where a
7-year-old has to use it unassisted cannot have a login screen. Do not add
authentication — if you need it, this app is the wrong starting point.

Basic abuse hygiene that *is* in place regardless of backend:

- Extras are capped at 200 characters, enforced on the server (not just the
  client) — see `server.js` (local) or `functions/api/extra.js` (Cloudflare).
- `person_id` and `chore_id` are validated against an allow-list derived
  from `public/config.js` on every request — unknown ids are rejected with
  a 400, never silently written.
- `date` values are validated as `YYYY-MM-DD` and must fall within a small
  window of the server's real UTC date, so the API can't be used to write
  arbitrary historical or future rows.
- A minimal in-memory per-IP rate limit is applied to the write endpoints.
  It's a speed bump, not a security boundary, but it costs under 20 lines
  and stops a runaway double-tap loop or a broken client from hammering the
  data store.

## Bumping the service worker cache

`public/sw.js` caches the app shell (HTML/CSS/JS/icons) under a versioned
cache name. Whenever you change **any** file in `public/` other than the
API responses themselves, bump `CACHE_VERSION` at the top of `public/sw.js`
(e.g. `"v1"` → `"v2"`) and restart the server / redeploy. The old cache is
deleted automatically once the new service worker activates. If you forget
to bump it, a device where the service worker *did* register (i.e. one
using `http://localhost`, or the Cloudflare/HTTPS deployment) may keep
serving stale shell files indefinitely — API calls are always network-first
regardless, so data itself never goes stale, only the shell can.

---

## Alternative: Cloudflare Pages + D1 (cloud hosting)

Everything below is for hosting the app on the public internet via
Cloudflare instead of a local device. It uses the same frontend
(`public/`) with a different backend (`functions/api/*.js` + a D1
database, defined in `wrangler.toml` and `schema.sql`).

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
