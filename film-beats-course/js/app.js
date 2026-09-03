/* Film Beats course — shared nav, "Learn more" modal, and progress tracking.
   No build step, no dependencies. Include after reference-data.js on every page. */

const NAV_LINKS = [
  { href: "index.html", label: "Course home", root: true },
  { href: "pages/part0.html", label: "Part 0 — Vocabulary" },
  { href: "pages/setup.html", label: "Setup" },
  { href: "pages/week1.html", label: "Week 1" },
  { href: "pages/week2.html", label: "Week 2" },
  { href: "pages/week3.html", label: "Week 3" },
  { href: "pages/week4.html", label: "Week 4" },
  { href: "pages/week5.html", label: "Week 5" },
  { href: "pages/week6.html", label: "Week 6" },
  { href: "pages/cheatsheet.html", label: "Cheat sheet" },
  { href: "pages/reference.html", label: "Glossary & how-to" },
  { href: "pages/notes.html", label: "Failure modes & sources" }
];

// All session checkboxes tracked for the overall course progress bar.
const PROGRESS_ITEMS = [
  ["setup", "Setup complete"],
  ["week1-a", "Week 1, Session A"],
  ["week1-b", "Week 1, Session B"],
  ["week2-a", "Week 2, Session A"],
  ["week2-b", "Week 2, Session B"],
  ["week3-a", "Week 3, Session A"],
  ["week3-b", "Week 3, Session B"],
  ["week4-a", "Week 4, Session A"],
  ["week4-b", "Week 4, Session B"],
  ["week5", "Week 5, Session"],
  ["week6-a", "Week 6, Session A"],
  ["week6-b", "Week 6, Session B"]
];

const PROGRESS_KEY = "filmbeats_progress_v1";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(state) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage unavailable (private mode, or file:// origin per page) — degrade silently */
  }
}

function setProgress(id, done) {
  const state = loadProgress();
  state[id] = !!done;
  saveProgress(state);
}

// --- Path helpers: pages live one level below the site root ---
function isInPagesDir() {
  return location.pathname.replace(/\\/g, "/").includes("/pages/");
}

function rootPrefix() {
  return isInPagesDir() ? "../" : "";
}

// --- Nav bar ---
function renderNav() {
  const mount = document.getElementById("site-nav");
  if (!mount) return;
  const prefix = rootPrefix();
  const currentFile = location.pathname.split("/").pop() || "index.html";

  const items = NAV_LINKS.map((link) => {
    const href = link.root ? prefix + "index.html" : prefix + link.href;
    const linkFile = link.href.split("/").pop();
    const isCurrent = linkFile === currentFile;
    return `<li><a href="${href}"${isCurrent ? ' class="current" aria-current="page"' : ""}>${link.label}</a></li>`;
  }).join("");

  mount.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="${prefix}index.html">Film Beats <span>— a step-by-step course</span></a>
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-list">Menu</button>
      <ul id="nav-list">${items}</ul>
    </div>`;

  const toggle = document.getElementById("nav-toggle");
  const list = document.getElementById("nav-list");
  toggle.addEventListener("click", () => {
    const open = list.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// --- "Learn more" modal, driven by REFERENCE_MAP ---
function renderModalShell() {
  if (document.getElementById("ref-modal")) return;
  const div = document.createElement("div");
  div.innerHTML = `
    <div id="ref-modal" class="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ref-modal-title">
        <button class="modal-close" id="ref-modal-close" aria-label="Close">&times;</button>
        <div class="modal-kicker">
          <span id="ref-modal-type" class="badge"></span>
          <span id="ref-modal-conf" class="badge"></span>
        </div>
        <h3 id="ref-modal-title"></h3>
        <div id="ref-modal-body" class="modal-body"></div>
        <p class="modal-footer"><a id="ref-modal-permalink" href="#">Open in full glossary &amp; how-to reference &rarr;</a></p>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);

  document.getElementById("ref-modal-close").addEventListener("click", closeRefModal);
  document.getElementById("ref-modal").addEventListener("click", (e) => {
    if (e.target.id === "ref-modal") closeRefModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRefModal();
  });
}

function closeRefModal() {
  const modal = document.getElementById("ref-modal");
  if (modal) modal.hidden = true;
}

const CONFIDENCE_LABEL = {
  verified: "verified",
  moderate: "moderate confidence",
  unverified: "unverified — check your unit"
};

function openRefEntry(id) {
  const entry = (typeof REFERENCE_MAP !== "undefined") ? REFERENCE_MAP[id] : null;
  if (!entry) return;
  renderModalShell();
  const modal = document.getElementById("ref-modal");
  document.getElementById("ref-modal-title").textContent = entry.title;
  document.getElementById("ref-modal-body").innerHTML = entry.body;
  document.getElementById("ref-modal-type").textContent = entry.type === "howto" ? "How to" : "Glossary";
  document.getElementById("ref-modal-type").className = "badge badge-" + entry.type;

  const confBadge = document.getElementById("ref-modal-conf");
  if (entry.confidence) {
    confBadge.hidden = false;
    confBadge.textContent = CONFIDENCE_LABEL[entry.confidence] || entry.confidence;
    confBadge.className = "badge badge-conf badge-conf-" + entry.confidence;
  } else {
    confBadge.hidden = true;
  }

  document.getElementById("ref-modal-permalink").href = rootPrefix() + "pages/reference.html#" + id;
  modal.hidden = false;

  // Allow nested term buttons inside the modal body to open other entries.
  document.getElementById("ref-modal-body").querySelectorAll("[data-ref]").forEach((btn) => {
    btn.addEventListener("click", () => openRefEntry(btn.getAttribute("data-ref")));
  });
}

function wireTermButtons(scope) {
  (scope || document).querySelectorAll("[data-ref]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openRefEntry(btn.getAttribute("data-ref"));
    });
  });
}

// --- Session progress checkboxes ---
function wireProgressCheckboxes() {
  const state = loadProgress();
  document.querySelectorAll("[data-progress-id]").forEach((box) => {
    const id = box.getAttribute("data-progress-id");
    box.checked = !!state[id];
    box.addEventListener("change", () => setProgress(id, box.checked));
  });
}

// --- Overall progress bar (index page) ---
function renderProgressSummary() {
  const mount = document.getElementById("progress-summary");
  if (!mount) return;
  const state = loadProgress();
  const done = PROGRESS_ITEMS.filter(([id]) => state[id]).length;
  const total = PROGRESS_ITEMS.length;
  const pct = Math.round((done / total) * 100);

  mount.innerHTML = `
    <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" style="width:${pct}%"></div>
    </div>
    <p class="progress-label">${done} of ${total} sessions marked complete (${pct}%)</p>`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  renderModalShell();
  wireTermButtons(document);
  wireProgressCheckboxes();
  renderProgressSummary();
});
