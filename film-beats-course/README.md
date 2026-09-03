# Film Beats — a step-by-step course

A six-week, self-paced online course built from a single written guide for
making sample-based beats from film audio on the Roland SP-404MK2 and Moog
Grandmother. Plain HTML/CSS/JS, **no build step, no npm dependencies, no
backend** — the whole thing is static files.

Two things make it a *course* rather than just the source document reformatted:

- **"Learn more" links.** Any technical term (`bar`, `transient`, `VINYL
  mode`…) or specific instruction (`lazy chop`, `skip-back sampling`, `MIDI
  clock sync`…) is a clickable button that opens a definition or full
  step-by-step procedure in place, without leaving the page. All of that
  content lives in one file, `js/reference-data.js`, and is also browsable
  and searchable on its own page (`pages/reference.html`).
- **Progress tracking.** Each week's sessions have a "mark complete"
  checkbox; the course home page shows an overall progress bar. Stored in
  the browser's `localStorage` — nothing is sent anywhere.

## Running it

### Option A — Netlify (free, recommended if you want a URL)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the `film-beats-course` folder onto the page.
3. Netlify gives you a live URL immediately. No account is strictly required
   for a one-off drop, though creating a free account lets you update the
   same site later instead of getting a new URL each time.

Alternatively, connect this GitHub repo to Netlify (New site from Git) and
set the **base directory** and **publish directory** both to
`film-beats-course`, with no build command — it's already built.

### Option B — a local server (recommended for local use)

Opening `index.html` directly by double-clicking it works, but most
browsers treat each `file://` page as its own private origin, so the
progress checkboxes won't be shared between pages. A tiny local server
fixes that and costs nothing:

```sh
# from inside film-beats-course/
npx serve .
# or
python3 -m http.server 8000
```

Then open the URL it prints (e.g. `http://localhost:3000` or
`http://localhost:8000`).

### Option C — just open the file

`index.html` works fine as a plain double-clicked file for reading through
the course. The only thing that doesn't work well this way is progress
tracking across pages — see Option B if you want that.

## Structure

```
film-beats-course/
  index.html              Course home — week list + progress bar
  css/style.css            All styling (light/dark aware)
  js/
    reference-data.js      Every glossary/how-to entry — the single source
                            of truth for all "Learn more" content
    app.js                 Shared nav, the "Learn more" modal, and
                            progress-checkbox wiring; included on every page
  pages/
    part0.html              Vocabulary (read before Week 1)
    setup.html               Signal chain, cables, one-time SP settings
    week1.html … week6.html  The six weeks
    cheatsheet.html          Full button-command table
    reference.html           Browsable/searchable glossary & how-to
    notes.html                Failure modes, unverified items, sources,
                              hosting notes
```

## Editing the content

- **To fix or extend a definition/procedure:** edit the relevant entry in
  `js/reference-data.js`. It updates everywhere that entry is linked from,
  automatically, plus its own listing on `pages/reference.html`.
- **To link a new term inline:** add
  `<button class="term" data-ref="the-id">term text</button>` to a page's
  HTML, where `the-id` matches an `id` in `reference-data.js`.
- **To add a new glossary/how-to entry:** add an object to the `REFERENCE`
  array in `reference-data.js` with a unique `id`, `type` (`"term"` or
  `"howto"`), `title`, `confidence` (`"verified"`, `"moderate"`,
  `"unverified"`, or `""`), and `body` (an HTML string).

No build step means every change is visible on a plain page reload.
