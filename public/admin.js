import { PEOPLE } from "./config.js";
import { EMOJI_LIST } from "./emoji-data.js";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // 0=Sun … 6=Sat
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_EMOJI = "🧹";

const el = {
  banner: document.getElementById("banner"),
  addForm: document.getElementById("add-chore-form"),
  emojiTrigger: document.getElementById("emoji-trigger"),
  emojiTriggerGlyph: document.getElementById("emoji-trigger-glyph"),
  emojiPanel: document.getElementById("emoji-panel"),
  emojiSearch: document.getElementById("emoji-search"),
  emojiGrid: document.getElementById("emoji-grid"),
  addLabel: document.getElementById("add-label"),
  addPeople: document.getElementById("add-people"),
  addDays: document.getElementById("add-days"),
  choresByPerson: document.getElementById("chores-by-person"),
};

const personById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

let chores = [];
const addFormState = { emoji: DEFAULT_EMOJI, people: new Set(), days: new Set([1, 2, 3, 4, 5]) };

// ============================================================================
// API — small standalone client (deliberately not shared with app.js, which
// runs its own init() on load and isn't meant to be imported into a
// different page).
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
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

const api = {
  getChores: () => apiRequest("GET", "/api/chores"),
  createChore: (body) => apiRequest("POST", "/api/chores", body),
  updateChore: (body) => apiRequest("PATCH", "/api/chores", body),
  deleteChore: (id) => apiRequest("DELETE", "/api/chores", { id }),
};

let bannerTimer = null;
function showBanner(message) {
  el.banner.textContent = message;
  el.banner.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (el.banner.hidden = true), 4000);
}

// ============================================================================
// Add-chore form
// ============================================================================

function renderAddPeopleChips() {
  el.addPeople.innerHTML = "";
  for (const person of PEOPLE) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "admin-chip" + (addFormState.people.has(person.id) ? " active" : "");
    chip.style.setProperty("--accent", person.colour);
    chip.textContent = `${person.emoji} ${person.name}`;
    chip.addEventListener("click", () => {
      if (addFormState.people.has(person.id)) addFormState.people.delete(person.id);
      else addFormState.people.add(person.id);
      renderAddPeopleChips();
    });
    el.addPeople.appendChild(chip);
  }
}

function renderAddDayPills() {
  el.addDays.innerHTML = "";
  for (let d = 0; d < 7; d++) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "admin-day-pill" + (addFormState.days.has(d) ? " active" : "");
    pill.textContent = DAY_LABELS[d];
    pill.setAttribute("aria-label", DAY_NAMES[d]);
    pill.title = DAY_NAMES[d];
    pill.addEventListener("click", () => {
      if (addFormState.days.has(d)) addFormState.days.delete(d);
      else addFormState.days.add(d);
      renderAddDayPills();
    });
    el.addDays.appendChild(pill);
  }
}

// ============================================================================
// Emoji picker — a word search over a curated, embedded emoji list (see
// emoji-data.js). No native OS picker or external service involved, so it
// works offline like the rest of this app.
// ============================================================================

function setSelectedEmoji(emoji) {
  addFormState.emoji = emoji;
  el.emojiTriggerGlyph.textContent = emoji;
}

function openEmojiPanel() {
  el.emojiPanel.hidden = false;
  el.emojiTrigger.setAttribute("aria-expanded", "true");
  el.emojiSearch.value = "";
  renderEmojiGrid("");
  el.emojiSearch.focus();
}

function closeEmojiPanel() {
  el.emojiPanel.hidden = true;
  el.emojiTrigger.setAttribute("aria-expanded", "false");
}

function renderEmojiGrid(query) {
  const q = query.trim().toLowerCase();
  const matches = q ? EMOJI_LIST.filter((item) => item.k.includes(q)) : EMOJI_LIST;

  el.emojiGrid.innerHTML = "";
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "admin-hint";
    empty.textContent = "No emoji match that search.";
    el.emojiGrid.appendChild(empty);
    return;
  }
  for (const item of matches) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-emoji-option";
    btn.textContent = item.e;
    btn.title = item.k.split(" ")[0];
    btn.addEventListener("click", () => {
      setSelectedEmoji(item.e);
      closeEmojiPanel();
    });
    el.emojiGrid.appendChild(btn);
  }
}

el.emojiTrigger.addEventListener("click", () => {
  if (el.emojiPanel.hidden) openEmojiPanel();
  else closeEmojiPanel();
});

el.emojiSearch.addEventListener("input", () => renderEmojiGrid(el.emojiSearch.value));

document.addEventListener("click", (evt) => {
  if (el.emojiPanel.hidden) return;
  if (el.emojiPanel.contains(evt.target) || el.emojiTrigger.contains(evt.target)) return;
  closeEmojiPanel();
});

el.addForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const emoji = addFormState.emoji;
  const label = el.addLabel.value.trim();
  const days = Array.from(addFormState.days);
  const people = Array.from(addFormState.people);

  if (!emoji) return showBanner("Pick an emoji first.");
  if (!label) return showBanner("Add a label first.");
  if (days.length === 0) return showBanner("Pick at least one day.");
  if (people.length === 0) return showBanner("Pick who it's for.");

  try {
    for (const person_id of people) {
      await api.createChore({ person_id, label, emoji, days });
    }
    el.addForm.reset();
    addFormState.people.clear();
    addFormState.days = new Set([1, 2, 3, 4, 5]);
    setSelectedEmoji(DEFAULT_EMOJI);
    renderAddPeopleChips();
    renderAddDayPills();
    await loadChores();
  } catch (err) {
    showBanner(err.message || "Couldn't add that chore.");
  }
});

// ============================================================================
// Existing chores list
// ============================================================================

async function loadChores() {
  try {
    const data = await api.getChores();
    chores = data.chores;
    renderChoresList();
  } catch {
    showBanner("Couldn't load chores — check your connection.");
  }
}

function renderChoresList() {
  el.choresByPerson.innerHTML = "";

  for (const person of PEOPLE) {
    const group = document.createElement("div");
    group.className = "admin-person-group";

    const heading = document.createElement("h3");
    heading.className = "admin-person-heading";
    heading.textContent = `${person.emoji} ${person.name}`;
    group.appendChild(heading);

    const personChores = chores.filter((c) => c.person_id === person.id);
    if (personChores.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-hint";
      empty.textContent = "No chores yet.";
      group.appendChild(empty);
    }

    for (const chore of personChores) {
      group.appendChild(renderChoreRow(chore));
    }

    el.choresByPerson.appendChild(group);
  }
}

function renderChoreRow(chore) {
  const row = document.createElement("div");
  row.className = "admin-chore-row";

  const top = document.createElement("div");
  top.className = "admin-chore-top";

  const emoji = document.createElement("span");
  emoji.className = "admin-chore-emoji";
  emoji.textContent = chore.emoji;

  const label = document.createElement("span");
  label.className = "admin-chore-label";
  label.textContent = chore.label;

  // Exactly one person owns a chore record — shown as a single pill
  // naming them, not a pair of chips (which read as "pick any
  // combination" when what they actually did was move ownership between
  // two mutually-exclusive states). Tap it to hand the chore to the other
  // person; the ↔ makes that a swap, not a toggle you might misread as
  // "both". "Duplicate" below is how the same chore ends up with both.
  const owner = personById[chore.person_id];
  const assigneeBtn = document.createElement("button");
  assigneeBtn.type = "button";
  assigneeBtn.className = "admin-assignee";
  assigneeBtn.style.setProperty("--accent", owner.colour);
  assigneeBtn.innerHTML = `<span>${owner.emoji} ${owner.name}</span><span class="admin-assignee-swap" aria-hidden="true">⇄</span>`;
  const otherPerson = PEOPLE.find((p) => p.id !== chore.person_id) || PEOPLE[0];
  assigneeBtn.title = `Move to ${otherPerson.name}`;
  assigneeBtn.addEventListener("click", () => reassignChore(chore, otherPerson.id));

  top.append(emoji, label, assigneeBtn);

  const daysRow = document.createElement("div");
  daysRow.className = "admin-day-row admin-day-row-compact";
  for (let d = 0; d < 7; d++) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "admin-day-pill" + (chore.days.includes(d) ? " active" : "");
    pill.textContent = DAY_LABELS[d];
    pill.title = DAY_NAMES[d];
    pill.addEventListener("click", () => toggleChoreDay(chore, d));
    daysRow.appendChild(pill);
  }

  const actions = document.createElement("div");
  actions.className = "admin-chore-actions";

  const duplicateBtn = document.createElement("button");
  duplicateBtn.type = "button";
  duplicateBtn.className = "admin-duplicate-btn";
  duplicateBtn.setAttribute("aria-label", `Duplicate ${chore.label} for ${otherPerson.name}`);
  duplicateBtn.title = `Duplicate for ${otherPerson.name}`;
  duplicateBtn.innerHTML = `⧉ <span>Duplicate for ${otherPerson.emoji} ${otherPerson.name}</span>`;
  duplicateBtn.addEventListener("click", () => duplicateChore(chore, otherPerson.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "admin-delete-btn";
  deleteBtn.setAttribute("aria-label", `Delete ${chore.label}`);
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => deleteChore(chore));

  actions.append(duplicateBtn, deleteBtn);

  row.append(top, daysRow, actions);
  return row;
}

async function reassignChore(chore, personId) {
  if (chore.person_id === personId) return;
  const previous = chore.person_id;
  chore.person_id = personId; // optimistic
  renderChoresList();
  try {
    await api.updateChore({ id: chore.id, person_id: personId });
  } catch (err) {
    chore.person_id = previous;
    renderChoresList();
    showBanner(err.message || "Couldn't reassign that chore.");
  }
}

async function toggleChoreDay(chore, day) {
  const hadDay = chore.days.includes(day);
  if (hadDay && chore.days.length === 1) {
    return showBanner("A chore needs at least one day — delete it instead if it's done.");
  }
  const previous = chore.days;
  chore.days = hadDay ? chore.days.filter((d) => d !== day) : [...chore.days, day].sort();
  renderChoresList();
  try {
    await api.updateChore({ id: chore.id, days: chore.days });
  } catch (err) {
    chore.days = previous;
    renderChoresList();
    showBanner(err.message || "Couldn't update that chore.");
  }
}

async function deleteChore(chore) {
  chores = chores.filter((c) => c.id !== chore.id);
  renderChoresList();
  try {
    await api.deleteChore(chore.id);
  } catch (err) {
    chores.push(chore);
    renderChoresList();
    showBanner(err.message || "Couldn't delete that chore.");
  }
}

// Makes an independent copy of a chore for another person — same label,
// emoji, and days, but its own record, so each person's copy can later be
// rescheduled or deleted separately. This is how the same chore ends up
// belonging to both people, since a single chore record only ever has one
// owner (see renderChoreRow).
async function duplicateChore(chore, personId) {
  const tempId = `temp-${Math.random().toString(36).slice(2)}`;
  const copy = { id: tempId, person_id: personId, label: chore.label, emoji: chore.emoji, days: [...chore.days] };
  chores.push(copy);
  renderChoresList();
  try {
    const result = await api.createChore({
      person_id: personId,
      label: chore.label,
      emoji: chore.emoji,
      days: chore.days,
    });
    copy.id = result.id;
  } catch (err) {
    chores = chores.filter((c) => c !== copy);
    renderChoresList();
    showBanner(err.message || "Couldn't duplicate that chore.");
  }
}

// ============================================================================
// Init
// ============================================================================

renderAddPeopleChips();
renderAddDayPills();
loadChores();
