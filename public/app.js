import { TIMEZONE, PEOPLE } from "./config.js";

// ============================================================================
// Constants / DOM refs
// ============================================================================

const LS_PERSON_KEY = "chore-tracker:person_id";
const LS_IOS_HINT_KEY = "chore-tracker:ios-hint-dismissed";
const POLL_MS = 20_000;

const el = {
  banner: document.getElementById("banner"),
  iosHint: document.getElementById("ios-hint"),
  iosHintDismiss: document.getElementById("ios-hint-dismiss"),
  header: document.getElementById("app-header"),
  headerPerson: document.getElementById("header-person"),
  switchPersonBtn: document.getElementById("switch-person-btn"),

  screenPicker: document.getElementById("screen-picker"),
  pickerCards: document.getElementById("picker-cards"),
  familyOverviewBtn: document.getElementById("family-overview-btn"),

  screenChores: document.getElementById("screen-chores"),
  choresDate: document.getElementById("chores-date"),
  choresCount: document.getElementById("chores-count"),
  choresProgressTrack: document.getElementById("chores-progress-track"),
  choresProgressBar: document.getElementById("chores-progress-bar"),
  choresCelebration: document.getElementById("chores-celebration"),
  choresList: document.getElementById("chores-list"),
  extraForm: document.getElementById("extra-form"),
  extraInput: document.getElementById("extra-input"),
  extrasList: document.getElementById("extras-list"),

  screenFamily: document.getElementById("screen-family"),
  familyToday: document.getElementById("family-today"),
  familyWeek: document.getElementById("family-week"),

  weekDayEditor: document.getElementById("week-day-editor"),
  weekDayEditorBackdrop: document.getElementById("week-day-editor-backdrop"),
  weekDayEditorTitle: document.getElementById("week-day-editor-title"),
  weekDayEditorClose: document.getElementById("week-day-editor-close"),
  weekDayEditorList: document.getElementById("week-day-editor-list"),
};

const personById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

// ============================================================================
// Date helpers (all Melbourne-local; the server never guesses the date)
// ============================================================================

const WEEKDAY_NUM = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// The week "resets" (fresh Mon–Fri chores, weekly star clears) at 1am
// Monday rather than midnight, so whoever's still up late Sunday night —
// or first up Monday before 1am — still sees the weekend state. This is
// the only place the day boundary is shifted; every other day-to-day
// transition still happens at ordinary local midnight.
function effectiveNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const isMonday = WEEKDAY_NUM[map.weekday] === 1;
  const hour = Number(map.hour) % 24; // some locales report midnight as "24"
  return isMonday && hour < 1 ? new Date(now.getTime() - 60 * 60 * 1000) : now;
}

function computeToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(effectiveNow(now));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    weekday: WEEKDAY_NUM[map.weekday],
  };
}

function humanToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(effectiveNow(now));
}

// Given today is a Saturday or Sunday, returns the [Mon,Tue,Wed,Thu,Fri]
// date strings of the week that just finished — the window the weekly
// star is judged against.
function mostRecentMonToFri(today) {
  const [y, m, d] = today.dateStr.split("-").map(Number);
  const daysSinceMonday = today.weekday === 0 ? 6 : 5; // Sun : Sat
  const monday = Date.UTC(y, m - 1, d - daysSinceMonday);
  return Array.from({ length: 5 }, (_, i) =>
    new Date(monday + i * 86_400_000).toISOString().slice(0, 10)
  );
}

// Formats a plain YYYY-MM-DD string for display. The string already IS the
// Melbourne calendar date, so parsing/formatting is done in UTC to avoid a
// browser timezone shifting it onto a different day.
function shortDayLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
  }).format(dt);
}

// Like humanToday(), but for an arbitrary YYYY-MM-DD string rather than
// "right now" — used by the week-day editor's title. Parsed/formatted in
// UTC for the same reason as shortDayLabel(): the string already IS the
// Melbourne calendar date.
function humanDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dt);
}

function weekdayForDateStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function choresForPerson(personId, weekday) {
  return state.chores.filter((c) => c.person_id === personId && c.days.includes(weekday));
}

// ============================================================================
// State
// ============================================================================

const state = {
  personId: localStorage.getItem(LS_PERSON_KEY) || null,
  // 'picker' | 'chores' | 'family'. 'chores' always implies personId is
  // set (you can't have a chore list without picking who you are); the
  // picker screen has its own shortcut into 'family' that leaves personId
  // untouched, so a family overview is reachable before picking anyone.
  view: localStorage.getItem(LS_PERSON_KEY) ? "chores" : "picker",
  today: computeToday(),
  chores: [], // [{id, person_id, label, emoji, days}], fetched from /api/chores
  day: { completions: new Set(), extras: [] }, // "person_id|chore_id" keys
  week: { dates: [], completions: [], extras: [] },
  // Set of "date|person_id|chore_id" for the most recently finished Mon–Fri,
  // only populated on Sat/Sun (see refreshStarWeek). Drives the weekly star.
  starWeekCompletions: null,
  pendingChoreKeys: new Set(),
  expandedFamilyPerson: null,
  // { personId, date } while the Family week grid's retroactive-edit
  // panel is open for that cell; null when closed.
  weekDayEditor: null,
};

function isWeekend() {
  return state.today.weekday === 0 || state.today.weekday === 6;
}

// True once someone has ticked off every chore they had on every weekday
// (Mon–Fri) of the week that just finished. Only meaningful on a Sat/Sun —
// callers should gate on isWeekend() themselves.
function hadPerfectWeek(personId) {
  if (!state.starWeekCompletions) return false;
  let total = 0;
  let done = 0;
  for (const dateStr of mostRecentMonToFri(state.today)) {
    for (const chore of choresForPerson(personId, weekdayForDateStr(dateStr))) {
      total += 1;
      if (state.starWeekCompletions.has(`${dateStr}|${personId}|${chore.id}`)) done += 1;
    }
  }
  return total > 0 && done === total;
}

// ============================================================================
// API client
// ============================================================================

async function apiRequest(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no/invalid body
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  getDay: (date) => apiRequest("GET", `/api/day?date=${encodeURIComponent(date)}`),
  getWeek: (end) => apiRequest("GET", `/api/week?end=${encodeURIComponent(end)}`),
  toggle: (body) => apiRequest("POST", "/api/toggle", body),
  addExtra: (body) => apiRequest("POST", "/api/extra", body),
  deleteExtra: (id) => apiRequest("DELETE", "/api/extra", { id }),
  getChores: () => apiRequest("GET", "/api/chores"),
};

// ============================================================================
// Banner
// ============================================================================

let bannerTimer = null;
function showBanner(message) {
  el.banner.textContent = message;
  el.banner.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    el.banner.hidden = true;
  }, 4000);
}

// ============================================================================
// Rendering
// ============================================================================

function render() {
  el.screenPicker.hidden = state.view !== "picker";
  el.screenChores.hidden = state.view !== "chores";
  el.screenFamily.hidden = state.view !== "family";
  el.header.hidden = state.view === "picker";

  if (state.view === "picker") {
    renderPicker();
    return;
  }

  renderHeader();

  if (state.view === "chores") {
    renderChoresScreen();
  } else {
    renderFamilyScreen();
  }
}

function renderPicker() {
  el.pickerCards.innerHTML = "";
  for (const person of PEOPLE) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "picker-card";
    card.style.setProperty("--accent", person.colour);
    card.dataset.personId = person.id;

    const tile = document.createElement("div");
    tile.className = "icon-tile";
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = person.emoji;
    tile.appendChild(emoji);

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = person.name;

    card.append(tile, name);
    if (isWeekend() && hadPerfectWeek(person.id)) {
      card.appendChild(starBadge());
    }
    card.addEventListener("click", () => choosePerson(person.id));
    el.pickerCards.appendChild(card);
  }
}

function starBadge() {
  const star = document.createElement("span");
  star.className = "star-badge";
  star.textContent = "⭐";
  star.title = "Perfect week!";
  return star;
}

function renderHeader() {
  const person = personById[state.personId];
  el.headerPerson.innerHTML = "";

  if (!person) {
    // Viewing Family via the picker's shortcut — nobody's been picked.
    el.headerPerson.style.removeProperty("--accent");
    const label = document.createElement("span");
    label.textContent = "👪 Family";
    el.headerPerson.appendChild(label);
    el.switchPersonBtn.textContent = "← Back";
    return;
  }

  const emoji = document.createElement("span");
  emoji.className = "emoji";
  emoji.textContent = person.emoji;

  const name = document.createElement("span");
  name.textContent = person.name;

  el.headerPerson.style.setProperty("--accent", person.colour);
  el.headerPerson.append(emoji, name);
  if (isWeekend() && hadPerfectWeek(person.id)) {
    el.headerPerson.appendChild(starBadge());
  }
  el.switchPersonBtn.textContent = "Switch person";
}

function renderChoresScreen() {
  const person = personById[state.personId];
  if (!person) return;

  el.screenChores.style.setProperty("--accent", person.colour);
  el.choresDate.textContent = humanToday();

  const chores = choresForPerson(person.id, state.today.weekday);
  const doneCount = chores.filter((c) =>
    state.day.completions.has(`${person.id}|${c.id}`)
  ).length;
  const total = chores.length;
  const weekend = isWeekend();
  const perfectWeek = weekend && hadPerfectWeek(person.id);

  el.choresProgressTrack.hidden = weekend;
  if (weekend) {
    el.choresCount.textContent = perfectWeek
      ? "Perfect week — nothing due till Monday!"
      : "No chores today — enjoy the weekend!";
  } else {
    el.choresCount.textContent = `${doneCount} of ${total} done`;
    el.choresProgressBar.style.width = total === 0 ? "0%" : `${(doneCount / total) * 100}%`;
  }
  el.choresCelebration.hidden = !(perfectWeek || (total > 0 && doneCount === total));
  el.choresCelebration.textContent = perfectWeek
    ? "⭐ You had a perfect week! ⭐"
    : "🎉 All done today! 🎉";

  el.choresList.innerHTML = "";
  if (chores.length === 0) {
    const empty = document.createElement("li");
    empty.className = "chores-empty";
    empty.textContent = "Nothing on the list for today 🎈";
    el.choresList.appendChild(empty);
  }

  for (const chore of chores) {
    const key = `${person.id}|${chore.id}`;
    const done = state.day.completions.has(key);

    const li = document.createElement("li");
    const row = document.createElement("button");
    row.type = "button";
    row.className = "chore-row" + (done ? " done" : "");
    row.style.setProperty("--accent", person.colour);

    const tile = document.createElement("div");
    tile.className = "icon-tile";
    const emoji = document.createElement("span");
    emoji.className = "chore-emoji";
    emoji.textContent = chore.emoji;
    tile.appendChild(emoji);

    const label = document.createElement("span");
    label.className = "chore-label";
    label.textContent = chore.label;

    const tick = document.createElement("span");
    tick.className = "chore-tick";
    tick.textContent = done ? "✓" : "";

    row.append(tile, label, tick);
    row.addEventListener("click", () => toggleChore(person.id, chore.id));

    li.appendChild(row);
    el.choresList.appendChild(li);
  }

  renderExtras();
}

function renderExtras() {
  el.extrasList.innerHTML = "";
  const mine = state.day.extras.filter((e) => e.person_id === state.personId);

  for (const extra of mine) {
    const li = document.createElement("li");
    li.className = "extra-row";

    const text = document.createElement("span");
    text.className = "extra-text";
    text.textContent = extra.text;
    li.appendChild(text);

    const pending = String(extra.id).startsWith("temp-");
    if (!pending) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "extra-delete";
      del.setAttribute("aria-label", "Delete");
      del.textContent = "✕";
      del.addEventListener("click", () => deleteExtra(extra.id));
      li.appendChild(del);
    }

    el.extrasList.appendChild(li);
  }
}

function statusFor(done, total) {
  if (total === 0 || done === total) return "complete";
  if (done === 0) return "none";
  return "partial";
}

function renderFamilyScreen() {
  el.familyToday.innerHTML = "";

  for (const person of PEOPLE) {
    const chores = choresForPerson(person.id, state.today.weekday);
    const done = chores.filter((c) =>
      state.day.completions.has(`${person.id}|${c.id}`)
    );
    const outstanding = chores.filter(
      (c) => !state.day.completions.has(`${person.id}|${c.id}`)
    );
    const extras = state.day.extras.filter((e) => e.person_id === person.id);
    const status = statusFor(done.length, chores.length);

    const wrap = document.createElement("li");
    wrap.className =
      "family-person" + (state.expandedFamilyPerson === person.id ? " expanded" : "");

    const row = document.createElement("button");
    row.type = "button";
    row.className = "family-person-row";
    row.style.setProperty("--accent", person.colour);
    row.addEventListener("click", () => toggleExpandFamilyPerson(person.id));

    const tile = document.createElement("div");
    tile.className = "icon-tile";
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = person.emoji;
    tile.appendChild(emoji);

    const nameWrap = document.createElement("span");
    nameWrap.className = "name-wrap";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = person.name;
    nameWrap.appendChild(name);
    if (isWeekend() && hadPerfectWeek(person.id)) nameWrap.appendChild(starBadge());

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${done.length}/${chores.length}`;

    const dot = document.createElement("span");
    dot.className = `status-dot status-${status}`;
    if (status === "complete") dot.style.setProperty("--accent", person.colour);

    row.append(tile, nameWrap, count, dot);
    wrap.appendChild(row);

    const details = document.createElement("div");
    details.className = "family-person-details";

    if (outstanding.length === 0 && extras.length === 0) {
      const nothing = document.createElement("div");
      nothing.className = "family-nothing";
      nothing.textContent = chores.length === 0 ? "No chores today." : "All done! Nothing extra logged.";
      details.appendChild(nothing);
    } else {
      if (outstanding.length > 0) {
        const label = document.createElement("div");
        label.className = "family-outstanding";
        label.textContent = "Still to do:";
        details.appendChild(label);
        for (const c of outstanding) {
          const item = document.createElement("div");
          item.className = "family-outstanding-item";
          item.textContent = `${c.emoji} ${c.label}`;
          details.appendChild(item);
        }
      }
      if (extras.length > 0) {
        const label = document.createElement("div");
        label.className = "family-outstanding";
        label.style.marginTop = "8px";
        label.textContent = "Extras:";
        details.appendChild(label);
        for (const e of extras) {
          const item = document.createElement("div");
          item.className = "family-extra-item";
          item.textContent = `• ${e.text}`;
          details.appendChild(item);
        }
      }
    }

    wrap.appendChild(details);
    el.familyToday.appendChild(wrap);
  }

  renderFamilyWeek();
}

function renderFamilyWeek() {
  const { dates } = state.week;
  el.familyWeek.innerHTML = "";
  if (dates.length === 0) return;

  const grid = document.createElement("div");
  grid.className = "week-grid";
  grid.style.gridTemplateColumns = `120px repeat(${dates.length}, 1fr)`;

  // Header row
  grid.appendChild(cellDiv("week-cell week-header", ""));
  for (const d of dates) {
    grid.appendChild(cellDiv("week-cell week-header", shortDayLabel(d)));
  }

  // One row per person
  for (const person of PEOPLE) {
    const label = document.createElement("div");
    label.className = "week-cell week-person-label";
    label.textContent = `${person.emoji} ${person.name}`;
    grid.appendChild(label);

    for (const d of dates) {
      const chores = choresForPerson(person.id, weekdayForDateStr(d));
      const doneCount = state.week.completions.filter(
        (c) => c.date === d && c.person_id === person.id
      ).length;
      const status = statusFor(doneCount, chores.length);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `week-cell week-day-cell status-${status}`;
      if (status === "complete") cell.style.setProperty("--accent", person.colour);
      cell.title = `${person.name} — ${shortDayLabel(d)}: ${doneCount}/${chores.length}. Tap to review or change.`;
      cell.addEventListener("click", () => openWeekDayEditor(person.id, d));
      grid.appendChild(cell);
    }
  }

  el.familyWeek.appendChild(grid);
}

function cellDiv(className, text) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return div;
}

// ============================================================================
// Week-day editor — lets a parent tap a cell in the Family week grid to go
// back and tick/untick that person's chores for that specific earlier day,
// for when something got done (or didn't) but nobody marked it at the time.
// ============================================================================

function weekCompletionKey(c) {
  return `${c.date}|${c.person_id}|${c.chore_id}`;
}

function openWeekDayEditor(personId, date) {
  state.weekDayEditor = { personId, date };
  renderWeekDayEditor();
}

function closeWeekDayEditor() {
  state.weekDayEditor = null;
  renderWeekDayEditor();
}

function renderWeekDayEditor() {
  const editing = state.weekDayEditor;
  el.weekDayEditor.hidden = !editing;
  if (!editing) return;

  const { personId, date } = editing;
  const person = personById[personId];
  el.weekDayEditorTitle.textContent = `${person.emoji} ${person.name} — ${humanDate(date)}`;

  const completedKeys = new Set(state.week.completions.map(weekCompletionKey));
  const chores = choresForPerson(personId, weekdayForDateStr(date));

  el.weekDayEditorList.innerHTML = "";
  if (chores.length === 0) {
    const empty = document.createElement("li");
    empty.className = "chores-empty";
    empty.textContent = "No chores that day.";
    el.weekDayEditorList.appendChild(empty);
    return;
  }

  for (const chore of chores) {
    const done = completedKeys.has(`${date}|${personId}|${chore.id}`);

    const li = document.createElement("li");
    const row = document.createElement("button");
    row.type = "button";
    row.className = "chore-row" + (done ? " done" : "");
    row.style.setProperty("--accent", person.colour);

    const tile = document.createElement("div");
    tile.className = "icon-tile";
    const emoji = document.createElement("span");
    emoji.className = "chore-emoji";
    emoji.textContent = chore.emoji;
    tile.appendChild(emoji);

    const label = document.createElement("span");
    label.className = "chore-label";
    label.textContent = chore.label;

    const tick = document.createElement("span");
    tick.className = "chore-tick";
    tick.textContent = done ? "✓" : "";

    row.append(tile, label, tick);
    row.addEventListener("click", () => toggleWeekDayChore(personId, date, chore.id));

    li.appendChild(row);
    el.weekDayEditorList.appendChild(li);
  }
}

async function toggleWeekDayChore(personId, date, choreId) {
  const key = `${date}|${personId}|${choreId}`;
  if (state.pendingChoreKeys.has(key)) return;
  state.pendingChoreKeys.add(key);

  const wasDone = state.week.completions.some((c) => weekCompletionKey(c) === key);
  const apply = (done) => {
    state.week.completions = state.week.completions.filter((c) => weekCompletionKey(c) !== key);
    if (done) state.week.completions.push({ date, person_id: personId, chore_id: choreId });
    if (date === state.today.dateStr) {
      const dayKey = `${personId}|${choreId}`;
      if (done) state.day.completions.add(dayKey);
      else state.day.completions.delete(dayKey);
    }
  };

  apply(!wasDone);
  renderWeekDayEditor();
  renderFamilyWeek();

  try {
    const result = await api.toggle({ date, person_id: personId, chore_id: choreId });
    apply(result.done);
  } catch (err) {
    apply(wasDone);
    showBanner("Couldn't save that — check your connection.");
  } finally {
    state.pendingChoreKeys.delete(key);
    renderWeekDayEditor();
    renderFamilyWeek();
    if (state.view === "chores") renderChoresScreen();
  }
}

// ============================================================================
// Actions
// ============================================================================

function choosePerson(personId) {
  state.personId = personId;
  localStorage.setItem(LS_PERSON_KEY, personId);
  state.view = "chores";
  render();
  refreshCurrentView();
  resetIdleTimer();
}

function switchPerson() {
  stopIdleTimer();
  state.personId = null;
  localStorage.removeItem(LS_PERSON_KEY);
  state.view = "picker";
  render();
}

// ============================================================================
// Idle timeout — the person screen (someone's own chore list) times back
// out to the picker after a minute of no taps, so it doesn't sit open under
// the wrong kid's name once they've wandered off. Only armed while actually
// on that screen; any tap/keypress anywhere resets the clock.
// ============================================================================

const IDLE_TIMEOUT_MS = 60_000;
let idleTimer = null;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (state.view !== "chores") return;
  idleTimer = setTimeout(() => {
    if (state.view === "chores") switchPerson();
  }, IDLE_TIMEOUT_MS);
}

function stopIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = null;
}

// From the picker screen's "Family overview" shortcut — peek at Family
// without picking who you are first. personId stays untouched.
function viewFamilyFromPicker() {
  state.view = "family";
  render();
  refreshCurrentView();
}

function toggleExpandFamilyPerson(personId) {
  state.expandedFamilyPerson = state.expandedFamilyPerson === personId ? null : personId;
  renderFamilyScreen();
}

async function toggleChore(personId, choreId) {
  const key = `${personId}|${choreId}`;
  if (state.pendingChoreKeys.has(key)) return;
  state.pendingChoreKeys.add(key);

  const wasDone = state.day.completions.has(key);
  if (wasDone) state.day.completions.delete(key);
  else state.day.completions.add(key);
  renderChoresScreen();

  try {
    const result = await api.toggle({
      date: state.today.dateStr,
      person_id: personId,
      chore_id: choreId,
    });
    if (result.done) state.day.completions.add(key);
    else state.day.completions.delete(key);
  } catch (err) {
    if (wasDone) state.day.completions.add(key);
    else state.day.completions.delete(key);
    showBanner("Couldn't save that — check your connection.");
  } finally {
    state.pendingChoreKeys.delete(key);
    renderChoresScreen();
  }
}

async function addExtra(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const tempId = `temp-${Math.random().toString(36).slice(2)}`;
  const optimistic = { id: tempId, person_id: state.personId, text: trimmed };
  state.day.extras.push(optimistic);
  el.extraInput.value = "";
  renderExtras();

  try {
    const result = await api.addExtra({
      date: state.today.dateStr,
      person_id: state.personId,
      text: trimmed,
    });
    optimistic.id = result.id;
  } catch (err) {
    state.day.extras = state.day.extras.filter((e) => e !== optimistic);
    showBanner(err.message || "Couldn't add that — check your connection.");
  } finally {
    renderExtras();
  }
}

async function deleteExtra(id) {
  const idx = state.day.extras.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const [removed] = state.day.extras.splice(idx, 1);
  renderExtras();

  try {
    await api.deleteExtra(id);
  } catch (err) {
    state.day.extras.splice(idx, 0, removed);
    showBanner("Couldn't delete that — check your connection.");
    renderExtras();
  }
}

// ============================================================================
// Data refresh / polling
// ============================================================================

// Populates state.starWeekCompletions for the weekly-star calculation.
// Only fetches on a Sat/Sun (the star is meaningless any other day); clears
// it the rest of the week so nothing stale lingers past the 1am Monday
// reset.
async function refreshStarWeek() {
  if (!isWeekend()) {
    state.starWeekCompletions = null;
    return;
  }
  const monToFri = mostRecentMonToFri(state.today);
  const data = await api.getWeek(monToFri[4]);
  const wanted = new Set(monToFri);
  state.starWeekCompletions = new Set(
    data.completions
      .filter((c) => wanted.has(c.date))
      .map((c) => `${c.date}|${c.person_id}|${c.chore_id}`)
  );
}

async function refreshCurrentView() {
  state.today = computeToday();
  try {
    const [choresData] = await Promise.all([api.getChores(), refreshStarWeek()]);
    state.chores = choresData.chores;

    if (state.view === "picker") {
      if (!el.screenPicker.hidden) renderPicker();
      return;
    }

    if (state.view === "chores") {
      const data = await api.getDay(state.today.dateStr);
      state.day.completions = new Set(
        data.completions.map((c) => `${c.person_id}|${c.chore_id}`)
      );
      state.day.extras = data.extras;
      if (!el.screenChores.hidden) renderChoresScreen();
    } else {
      const [dayData, weekData] = await Promise.all([
        api.getDay(state.today.dateStr),
        api.getWeek(state.today.dateStr),
      ]);
      state.day.completions = new Set(
        dayData.completions.map((c) => `${c.person_id}|${c.chore_id}`)
      );
      state.day.extras = dayData.extras;
      state.week = weekData;
      if (!el.screenFamily.hidden) renderFamilyScreen();
    }
  } catch (err) {
    showBanner("Couldn't refresh — check your connection.");
  }
}

function startPolling() {
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    refreshCurrentView();
  }, POLL_MS);

  window.addEventListener("focus", refreshCurrentView);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshCurrentView();
  });
}

// ============================================================================
// iOS "Add to Home Screen" hint
// ============================================================================

function setupIosHint() {
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  const isIos = /iP(hone|od|ad)/.test(navigator.userAgent);
  const dismissed = localStorage.getItem(LS_IOS_HINT_KEY) === "1";

  if (isIos && !isStandalone && !dismissed) {
    el.iosHint.hidden = false;
  }
  el.iosHintDismiss.addEventListener("click", () => {
    el.iosHint.hidden = true;
    localStorage.setItem(LS_IOS_HINT_KEY, "1");
  });
}

// ============================================================================
// Service worker
// ============================================================================

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — app still works without offline shell caching.
    });
  }
}

// ============================================================================
// Init
// ============================================================================

function init() {
  el.switchPersonBtn.addEventListener("click", switchPerson);
  el.familyOverviewBtn.addEventListener("click", viewFamilyFromPicker);
  el.extraForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    addExtra(el.extraInput.value);
  });

  el.weekDayEditorClose.addEventListener("click", closeWeekDayEditor);
  el.weekDayEditorBackdrop.addEventListener("click", closeWeekDayEditor);
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && state.weekDayEditor) closeWeekDayEditor();
  });

  // Any tap/keypress anywhere resets the person-screen idle clock;
  // resetIdleTimer() itself is a no-op unless we're actually on that screen.
  document.addEventListener("click", resetIdleTimer);
  document.addEventListener("touchstart", resetIdleTimer, { passive: true });
  document.addEventListener("keydown", resetIdleTimer);

  setupIosHint();
  registerServiceWorker();

  render();
  refreshCurrentView();
  startPolling();
  resetIdleTimer();
}

init();
