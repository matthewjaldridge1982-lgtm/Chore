// =============================================================================
// config.js — the ONLY place people and chores are defined.
//
// This file is imported directly by both the browser (public/app.js) and the
// server (Cloudflare Pages Functions in functions/api/*.js), so there is only
// ever one copy of the truth. Nothing about people or chores lives in the
// database or is editable from the UI — edit this file and redeploy.
//
// -----------------------------------------------------------------------------
// HOW TO ADD OR REMOVE A PERSON
// -----------------------------------------------------------------------------
// 1. Add/remove an entry in the PEOPLE array below.
//      id     — short, stable, lowercase, unique. NEVER reuse an id for a
//               different person once chores/completions reference it — pick
//               a new one (e.g. "p5") instead.
//      name   — display name shown in the UI.
//      emoji  — single emoji used everywhere instead of a photo/avatar.
//      colour — hex colour used for that person's progress bar, cards, etc.
//               Pick something that reads clearly on white (avoid pale
//               yellows). No two people need distinct colours to *work*, but
//               it's much easier to read the Family view if they are.
// 2. Add/remove that person's chores in the CHORES array (see below).
// 3. Redeploy. No other file needs to change — layouts flex to fit anywhere
//    from 3 to 6 people automatically.
//
// -----------------------------------------------------------------------------
// HOW TO ADD, REMOVE OR CHANGE A CHORE
// -----------------------------------------------------------------------------
// Add/remove an entry in the CHORES array. Each chore needs:
//      id     — short, stable, lowercase, unique across ALL chores (not just
//               within one person). Never reuse an id for a different chore.
//      person — must match a PEOPLE id exactly.
//      label  — short chore text, shown at a large font size. Keep it to a
//               few words — this is read by a 7-year-old.
//      emoji  — single emoji shown to the left of the label.
//      days   — either the string "daily", or an array of weekday numbers
//               this chore applies on:
//                 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
//                 4 = Thursday, 5 = Friday, 6 = Saturday
//               Example: [1,3,5] = Monday, Wednesday, Friday only.
//
// Changing a chore's `label`/`emoji`/`days` takes effect immediately for
// today onward; past completions (which are keyed by chore id, not label)
// are untouched, so history doesn't get rewritten just because you renamed
// something.
//
// If you delete a chore or person entirely, any old completion/extra rows
// for them simply stop being displayed (the API filters against this file's
// current lists) — you don't need to clean up the database.
//
// -----------------------------------------------------------------------------
// THE WEEKLY STAR
// -----------------------------------------------------------------------------
// This starter set only schedules chores on weekdays (days 1–5). Whenever
// someone completes every chore they had that Monday–Friday, a ⭐ appears
// against their name on the picker screen and in the Family view for the
// rest of the weekend. It clears automatically at 1am Monday, when the new
// week's tracking starts fresh (see app.js's effectiveNow()).
//
// This is computed live from that week's completions — nothing is stored
// specifically as "the star". If you add a chore scheduled on a Saturday or
// Sunday (day 0 or 6), it simply won't count toward the star (only days
// 1–5 do); the app doesn't stop you from having weekend chores, they just
// sit outside the Monday–Friday star calculation.
// =============================================================================

export const TIMEZONE = "Australia/Melbourne";

export const PEOPLE = [
  { id: "p1", name: "Rocco", emoji: "🕷️", colour: "#ff9500" },
  { id: "p2", name: "Leonardo", emoji: "🐧", colour: "#007aff" },
  { id: "p3", name: "Mum", emoji: "🐱", colour: "#34c759" },
  { id: "p4", name: "Dad", emoji: "🐦‍⬛", colour: "#af52de" },
];

export const CHORES = [
  // --- Rocco (7) --- all weekdays; a perfect Mon–Fri earns the weekly star.
  { id: "c1", person: "p1", label: "Make bed", emoji: "🛏️", days: [1, 2, 3, 4, 5] },
  { id: "c2", person: "p1", label: "Feed the cat", emoji: "🐱", days: [1, 2, 3, 4, 5] },
  { id: "c3", person: "p1", label: "Pack school bag", emoji: "🎒", days: [1, 2, 3, 4, 5] },
  { id: "c4", person: "p1", label: "Toys away", emoji: "🧸", days: [1, 2, 3, 4, 5] },

  // --- Leonardo (11) ---
  { id: "c5", person: "p2", label: "Make bed", emoji: "🛏️", days: [1, 2, 3, 4, 5] },
  { id: "c6", person: "p2", label: "Empty dishwasher", emoji: "🍽️", days: [1, 3, 5] },
  { id: "c7", person: "p2", label: "Take out bins", emoji: "🗑️", days: [2, 5] },
  { id: "c8", person: "p2", label: "Practice reading", emoji: "📖", days: [1, 2, 3, 4, 5] },

  // --- Mum ---
  { id: "c9", person: "p3", label: "Cook dinner", emoji: "🍳", days: [1, 2, 3, 4, 5] },
  { id: "c10", person: "p3", label: "Wipe kitchen", emoji: "🧽", days: [1, 2, 3, 4, 5] },
  { id: "c11", person: "p3", label: "Water plants", emoji: "🪴", days: [1, 3] },
  { id: "c12", person: "p3", label: "Laundry", emoji: "🧺", days: [1, 4] },

  // --- Dad ---
  { id: "c13", person: "p4", label: "Walk the dog", emoji: "🐕", days: [1, 2, 3, 4, 5] },
  { id: "c14", person: "p4", label: "Pack lunches", emoji: "🥪", days: [1, 2, 3, 4, 5] },
  { id: "c15", person: "p4", label: "Bins to kerb", emoji: "🚮", days: [1] },
  { id: "c16", person: "p4", label: "Tidy lounge", emoji: "🛋️", days: [1, 2, 3, 4, 5] },
];
