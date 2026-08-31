// =============================================================================
// config.js — where the family (PEOPLE) is defined.
//
// This file is imported directly by both the browser (public/app.js) and the
// server (server.js locally, or Cloudflare Pages Functions in
// functions/api/*.js if you're on that backend instead).
//
// Chores used to live here too, but now live in the database and are
// managed from the /admin page instead — see "MANAGING CHORES" below.
//
// -----------------------------------------------------------------------------
// HOW TO ADD OR REMOVE A PERSON
// -----------------------------------------------------------------------------
// 1. Add/remove an entry in the PEOPLE array below.
//      id     — short, stable, lowercase, unique. NEVER reuse an id for a
//               different person once chores/completions reference it — pick
//               a new one (e.g. "p3") instead.
//      name   — display name shown in the UI.
//      emoji  — single emoji used everywhere instead of a photo/avatar.
//      colour — hex colour used for that person's progress bar, cards, etc.
//               Pick something that reads clearly on white (avoid pale
//               yellows). No two people need distinct colours to *work*, but
//               it's much easier to read the Family view if they are.
// 2. If you removed someone, their chores on the /admin page are still
//    listed but now point at a person who no longer exists — delete those
//    chores from /admin too (the picker/list layouts flex to fit anywhere
//    from 2 to 6 people automatically either way).
// 3. Restart the server (or redeploy, on the Cloudflare backend) so the
//    change takes effect.
//
// -----------------------------------------------------------------------------
// MANAGING CHORES
// -----------------------------------------------------------------------------
// Open /admin.html (e.g. http://localhost:3000/admin.html) to add, reassign,
// reschedule, or delete chores — no file editing or restart needed, changes
// show up on the kiosk screen within its normal ~20s refresh. Each chore
// has a label, an emoji, which person it belongs to, and which weekdays it's
// scheduled on (0=Sunday … 6=Saturday).
//
// -----------------------------------------------------------------------------
// THE WEEKLY STAR
// -----------------------------------------------------------------------------
// Whenever someone completes every chore they had that Monday–Friday, a ⭐
// appears against their name on the picker screen and in the Family view
// for the rest of the weekend. It clears automatically at 1am Monday, when
// the new week's tracking starts fresh (see app.js's effectiveNow()).
//
// This is computed live from that week's completions — nothing is stored
// specifically as "the star". A chore scheduled on a Saturday or Sunday
// simply won't count toward it (only weekdays 1–5 do); it's still fully
// usable, it just sits outside the Monday–Friday star calculation.
// =============================================================================

export const TIMEZONE = "Australia/Melbourne";

export const PEOPLE = [
  { id: "p1", name: "Rocco", emoji: "💀", colour: "#ff9500" },
  { id: "p2", name: "Leonardo", emoji: "🐧", colour: "#007aff" },
];
