import { TIMEZONE, PEOPLE, CHORES } from "./config.js";

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
  bottomNav: document.getElementById("bottom-nav"),
  navChores: document.getElementById("nav-chores"),
  navFamily: document.getElementById("nav-family"),

  screenPicker: document.getElementById("screen-picker"),
  pickerCards: document.getElementById("picker-cards"),

  screenChores: document.getElementById("screen-chores"),
  choresDate: document.getElementById("chores-date"),
  choresCount: document.getElementById("chores-count"),
  choresProgressBar: document.getElementById("chores-progress-bar"),
  choresCelebration: document.getElementById("chores-celebration"),
  choresList: document.getElementById("chores-list"),
  extraForm: document.getElementById("extra-form"),
  extraInput: document.getElementById("extra-input"),
  extrasList: document.getElementById("extras-list"),

  screenFamily: document.getElementById("screen-family"),
  familyToday: document.getElementById("family-today"),
  familyWeek: document.getElementById("family-week"),
};

const personById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

// ============================================================================
// Date helpers (all Melbourne-local; the server never guesses the date)
// ============================================================================

const WEEKDAY_NUM = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function computeToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
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
  }).format(now);
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

function weekdayForDateStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function choresForPerson(personId, weekday) {
  return CHORES.filter(
    (c) => c.person === personId && (c.days === "daily" || c.days.includes(weekday))
  );
}

// ============================================================================
// State
// ============================================================================

const state = {
  personId: localStorage.getItem(LS_PERSON_KEY) || null,
  view: "chores", // 'chores' | 'family'
  today: computeToday(),
  day: { completions: new Set(), extras: [] }, // "person_id|chore_id" keys
  week: { dates: [], completions: [], extras: [] },
  pendingChoreKeys: new Set(),
  expandedFamilyPerson: null,
};

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
  const pickingPerson = !state.personId;

  el.screenPicker.hidden = !pickingPerson;
  el.header.hidden = pickingPerson;
  el.bottomNav.hidden = pickingPerson;
  el.screenChores.hidden = pickingPerson || state.view !== "chores";
  el.screenFamily.hidden = pickingPerson || state.view !== "family";

  if (pickingPerson) {
    renderPicker();
    return;
  }

  renderHeader();
  el.navChores.classList.toggle("active", state.view === "chores");
  el.navFamily.classList.toggle("active", state.view === "family");

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

    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = person.emoji;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = person.name;

    card.append(emoji, name);
    card.addEventListener("click", () => choosePerson(person.id));
    el.pickerCards.appendChild(card);
  }
}

function renderHeader() {
  const person = personById[state.personId];
  el.headerPerson.innerHTML = "";
  if (!person) return;

  const emoji = document.createElement("span");
  emoji.className = "emoji";
  emoji.textContent = person.emoji;

  const name = document.createElement("span");
  name.textContent = person.name;

  el.headerPerson.style.setProperty("--accent", person.colour);
  el.headerPerson.append(emoji, name);
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

  el.choresCount.textContent = `${doneCount} of ${total} done`;
  el.choresProgressBar.style.width = total === 0 ? "0%" : `${(doneCount / total) * 100}%`;
  el.choresCelebration.hidden = !(total > 0 && doneCount === total);

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

    const emoji = document.createElement("span");
    emoji.className = "chore-emoji";
    emoji.textContent = chore.emoji;

    const label = document.createElement("span");
    label.className = "chore-label";
    label.textContent = chore.label;

    const tick = document.createElement("span");
    tick.className = "chore-tick";
    tick.textContent = done ? "✓" : "";

    row.append(emoji, label, tick);
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
    row.addEventListener("click", () => toggleExpandFamilyPerson(person.id));

    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = person.emoji;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = person.name;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${done.length}/${chores.length}`;

    const dot = document.createElement("span");
    dot.className = `status-dot status-${status}`;

    row.append(emoji, name, count, dot);
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

      const cell = document.createElement("div");
      cell.className = `week-cell week-day-cell status-${status}`;
      cell.title = `${person.name} — ${shortDayLabel(d)}: ${doneCount}/${chores.length}`;
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
// Actions
// ============================================================================

function choosePerson(personId) {
  state.personId = personId;
  localStorage.setItem(LS_PERSON_KEY, personId);
  state.view = "chores";
  render();
  refreshCurrentView();
}

function switchPerson() {
  state.personId = null;
  localStorage.removeItem(LS_PERSON_KEY);
  render();
}

function switchView(view) {
  if (state.view === view) return;
  state.view = view;
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

async function refreshCurrentView() {
  state.today = computeToday();
  try {
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
    if (!state.personId) return;
    refreshCurrentView();
  }, POLL_MS);

  window.addEventListener("focus", () => {
    if (state.personId) refreshCurrentView();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.personId) refreshCurrentView();
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
  el.navChores.addEventListener("click", () => switchView("chores"));
  el.navFamily.addEventListener("click", () => switchView("family"));
  el.extraForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    addExtra(el.extraInput.value);
  });

  setupIosHint();
  registerServiceWorker();

  render();
  if (state.personId) refreshCurrentView();
  startPolling();
}

init();
