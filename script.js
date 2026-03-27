const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
  dashboard: "ascendchan-dashboard-state",
  threads: "ascendchan-threads",
  reports: "ascendchan-reports",
  moderation: "ascendchan-moderation",
  spamState: "ascendchan-spam-state",
  bookmarks: "ascendchan-bookmarks",
};

const defaultPrefs = {
  theme: "classic-olive",
  font: "tahoma",
  fontWeight: "regular",
  fontSize: 100,
};

const adminPasswords = {
  admin: "sarthak@ascend666",
  developer: "ascend-dev",
};

const boardKeys = ["mind", "body", "study", "skill", "grind", "social", "tech", "exam", "meta"];

const body = document.body;
const customizePanel = document.getElementById("customizePanel");
const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const customizeToggle = document.getElementById("customizeToggle");
const loginToggle = document.getElementById("loginToggle");
const fontSelect = document.getElementById("fontSelect");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const savePreferences = document.getElementById("savePreferences");
const resetPreferences = document.getElementById("resetPreferences");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const fontWeightButtons = document.querySelectorAll("[data-font-weight]");
const boardRows = Array.from(document.querySelectorAll(".board-row"));
const bookmarksToggle = document.getElementById("bookmarksToggle");
const bookmarkList = document.getElementById("bookmarkList");
const recentList = document.getElementById("recentList");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginStatus = document.getElementById("loginStatus");
const dashboardRole = document.getElementById("dashboardRole");
const roleDescription = document.getElementById("roleDescription");
const logoutButton = document.getElementById("logoutButton");
const readOnlyToggle = document.getElementById("readOnlyToggle");
const slowModeToggle = document.getElementById("slowModeToggle");
const approvalToggle = document.getElementById("approvalToggle");
const boardSelect = document.getElementById("boardSelect");
const threadSelect = document.getElementById("threadSelect");
const reportQueue = document.getElementById("reportQueue");
const pinThreadButton = document.getElementById("pinThreadButton");
const lockThreadButton = document.getElementById("lockThreadButton");
const archiveThreadButton = document.getElementById("archiveThreadButton");
const clearReportsButton = document.getElementById("clearReportsButton");
const resetCooldownsButton = document.getElementById("resetCooldownsButton");
const backupThreadsButton = document.getElementById("backupThreadsButton");
const dashboardActionNotice = document.getElementById("dashboardActionNotice");

let draftPrefs = loadPreferences();
let dashboardNoticeTimeout;

function loadPreferences() {
  return {
    theme: localStorage.getItem(storageKeys.theme) || defaultPrefs.theme,
    font: localStorage.getItem(storageKeys.font) || defaultPrefs.font,
    fontWeight:
      localStorage.getItem(storageKeys.fontWeight) || defaultPrefs.fontWeight,
    fontSize: Number(localStorage.getItem(storageKeys.fontSize)) || defaultPrefs.fontSize,
  };
}

function applyPreferences(preferences) {
  body.dataset.theme = preferences.theme;
  body.dataset.font = preferences.font;
  body.dataset.fontWeight = preferences.fontWeight;
  body.style.setProperty("--content-font-scale", String(preferences.fontSize / 100));
  fontSelect.value = preferences.font;
  if (fontSizeRange) {
    fontSizeRange.value = String(preferences.fontSize);
  }
  if (fontSizeValue) {
    fontSizeValue.textContent = `${preferences.fontSize}%`;
  }

  themeButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.themeOption === preferences.theme,
    );
  });

  fontWeightButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.fontWeight === preferences.fontWeight,
    );
  });
}

function persistPreferences(preferences) {
  localStorage.setItem(storageKeys.theme, preferences.theme);
  localStorage.setItem(storageKeys.font, preferences.font);
  localStorage.setItem(storageKeys.fontWeight, preferences.fontWeight);
  localStorage.setItem(storageKeys.fontSize, String(preferences.fontSize));
}

function resetPreferencesToDefault() {
  draftPrefs = { ...defaultPrefs };
  applyPreferences(draftPrefs);
  persistPreferences(draftPrefs);
}

function loadThreads() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.threads)) || {};
  } catch {
    return {};
  }
}

function saveThreads(threadMap) {
  localStorage.setItem(storageKeys.threads, JSON.stringify(threadMap));
}

function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.reports)) || [];
  } catch {
    return [];
  }
}

function saveReports(reportList) {
  localStorage.setItem(storageKeys.reports, JSON.stringify(reportList));
}

function loadModeration() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.moderation)) || {};
  } catch {
    return {};
  }
}

function saveModeration(state) {
  localStorage.setItem(storageKeys.moderation, JSON.stringify(state));
}

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.bookmarks)) || {};
  } catch {
    return {};
  }
}

function loadDashboardState() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.dashboard)) || {};
  } catch {
    return {};
  }
}

function saveDashboardState(state) {
  localStorage.setItem(storageKeys.dashboard, JSON.stringify(state));
}

function openPanel(panel) {
  [customizePanel, loginPanel, dashboardPanel].forEach((item) => {
    item.classList.add("hidden");
  });
  panel.classList.remove("hidden");
}

function closePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add("hidden");
  }
}

function syncDashboardState() {
  const state = loadDashboardState();
  readOnlyToggle.checked = Boolean(state.readOnly);
  slowModeToggle.checked = Boolean(state.slowMode);
  approvalToggle.checked = Boolean(state.approvalOnly);
}

function updateDashboardRole(role) {
  dashboardRole.textContent = `${role} mode unlocked`;
  roleDescription.textContent =
    role === "admin"
      ? "Admin can pin, lock, archive, clear reports, and manage board-level moderation."
      : "Developer can access board tooling, forum state controls, and maintenance actions.";
}

function unlockDashboard(role) {
  localStorage.setItem(storageKeys.role, role);

  if (role === "admin") {
    window.location.href = "admin.html";
    return;
  }

  updateDashboardRole(role);
  syncDashboardState();
  syncDashboardData();
  openPanel(dashboardPanel);
  loginPanel.classList.add("hidden");
  loginStatus.textContent = `${role} login successful.`;
  passwordInput.value = "";
}

function syncSavedLoginState() {
  const savedRole = localStorage.getItem(storageKeys.role);
  if (savedRole === "admin") {
    loginToggle.textContent = "Admin";
    loginToggle.onclick = () => {
      window.location.href = "admin.html";
    };
    return savedRole;
  }

  if (savedRole === "developer") {
    loginToggle.textContent = "Developer";
    loginToggle.onclick = () => {
      updateDashboardRole(savedRole);
      syncDashboardState();
      syncDashboardData();
      openPanel(dashboardPanel);
    };
    return savedRole;
  }

  loginToggle.textContent = "Login";
  loginToggle.onclick = null;
  return null;
}

function renderBookmarks() {
  const bookmarks = loadBookmarks();
  const threads = loadThreads();
  const items = [];

  Object.entries(bookmarks).forEach(([board, ids]) => {
    const boardThreads = Array.isArray(threads[board]) ? threads[board] : [];
    ids.forEach((threadId) => {
      const thread = boardThreads.find((entry) => Number(entry.threadId) === Number(threadId));
      if (thread) {
        items.push(
          `<a href="thread.html?board=${board}&thread=${thread.threadId}">/${board}/ No.${thread.threadId} ${thread.subject}</a>`,
        );
      }
    });
  });

  bookmarkList.innerHTML = items.length
    ? items.join("")
    : '<p class="empty-state">No bookmarked threads.</p>';
}

function renderRecentActivity() {
  const threads = loadThreads();
  const activity = [];
  Object.entries(threads).forEach(([board, boardThreads]) => {
    boardThreads.forEach((thread) => {
      activity.push({
        board,
        threadId: thread.threadId,
        subject: thread.subject,
        updatedAt: Number(thread.updatedAt || thread.createdAt || 0),
      });
    });
  });

  activity.sort((a, b) => b.updatedAt - a.updatedAt);
  recentList.innerHTML = activity.length
    ? activity.slice(0, 8).map((entry) => `<a href="thread.html?board=${entry.board}&thread=${entry.threadId}">/${entry.board}/ No.${entry.threadId} ${entry.subject}</a>`).join("")
    : '<p class="empty-state">No Recent Activity :(</p>';
}

function renderReportQueue() {
  const reports = loadReports();
  reportQueue.innerHTML = reports.length
    ? reports
        .map(
          (report) => `
            <div class="report-item">
              <strong>/${report.board}/ No.${report.threadId} >>${report.postId}</strong>
              <span>Reported from thread menu</span>
            </div>
          `,
        )
        .join("")
    : '<p class="empty-state">No reports yet.</p>';
}

function renderThreadSelect() {
  const board = (boardSelect.value || "/mind/").replaceAll("/", "");
  const threads = Array.isArray(loadThreads()[board]) ? loadThreads()[board] : [];
  if (!threads.length) {
    threadSelect.innerHTML = '<option value="">No threads</option>';
    return;
  }

  threadSelect.innerHTML = threads
    .map((thread) => `<option value="${thread.threadId}">No.${thread.threadId} ${thread.subject}</option>`)
    .join("");
}

function syncDashboardData() {
  renderReportQueue();
  renderThreadSelect();
}

function showDashboardNotice(message) {
  if (!dashboardActionNotice) {
    return;
  }

  dashboardActionNotice.textContent = message;
  dashboardActionNotice.classList.remove("hidden");
  window.clearTimeout(dashboardNoticeTimeout);
  dashboardNoticeTimeout = window.setTimeout(() => {
    dashboardActionNotice.classList.add("hidden");
  }, 2200);
}

function getSelectedThreadRef() {
  const board = (boardSelect.value || "/mind/").replaceAll("/", "");
  const threadId = Number(threadSelect.value);
  if (!threadId) {
    return null;
  }

  const threadMap = loadThreads();
  const boardThreads = Array.isArray(threadMap[board]) ? threadMap[board] : [];
  const thread = boardThreads.find((entry) => Number(entry.threadId) === threadId);
  if (!thread) {
    return null;
  }

  return { board, threadId, thread, threadMap };
}

function mutateModeration(callback) {
  const selected = getSelectedThreadRef();
  if (!selected) {
    return;
  }
  const moderation = loadModeration();
  moderation[selected.board] = moderation[selected.board] || {};
  moderation[selected.board][selected.threadId] = moderation[selected.board][selected.threadId] || {};
  callback(moderation[selected.board][selected.threadId], selected);
  saveModeration(moderation);
}

function applyModerationToThreads() {
  const moderation = loadModeration();
  const threads = loadThreads();

  Object.entries(moderation).forEach(([board, boardModeration]) => {
    const boardThreads = Array.isArray(threads[board]) ? threads[board] : [];
    boardThreads.forEach((thread) => {
      const state = boardModeration[thread.threadId];
      if (state) {
        thread.pinned = Boolean(state.pinned);
        thread.locked = Boolean(state.locked);
        thread.archived = Boolean(state.archived);
      }
    });
  });

  saveThreads(threads);
}

customizeToggle.addEventListener("click", () => {
  draftPrefs = loadPreferences();
  applyPreferences(draftPrefs);
  openPanel(customizePanel);
});

loginToggle.addEventListener("click", () => {
  if (localStorage.getItem(storageKeys.role) === "admin") {
    window.location.href = "admin.html";
    return;
  }
  if (localStorage.getItem(storageKeys.role) === "developer") {
    updateDashboardRole("developer");
    syncDashboardState();
    syncDashboardData();
    openPanel(dashboardPanel);
    return;
  }
  loginStatus.textContent =
    "Use developer or admin password to unlock moderation tools.";
  passwordInput.value = "";
  openPanel(loginPanel);
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    draftPrefs = { ...draftPrefs, theme: button.dataset.themeOption };
    applyPreferences(draftPrefs);
  });
});

fontSelect.addEventListener("change", (event) => {
  draftPrefs = { ...draftPrefs, font: event.target.value };
  applyPreferences(draftPrefs);
});

if (fontSizeRange) {
  fontSizeRange.addEventListener("input", (event) => {
    draftPrefs = { ...draftPrefs, fontSize: Number(event.target.value) };
    applyPreferences(draftPrefs);
  });
}

fontWeightButtons.forEach((button) => {
  button.addEventListener("click", () => {
    draftPrefs = { ...draftPrefs, fontWeight: button.dataset.fontWeight };
    applyPreferences(draftPrefs);
  });
});

savePreferences.addEventListener("click", () => {
  persistPreferences(draftPrefs);
  customizePanel.classList.add("hidden");
});

resetPreferences.addEventListener("click", () => {
  resetPreferencesToDefault();
});

boardRows.forEach((row) => {
  row.addEventListener("click", () => {
    window.location.href = `board.html?board=${row.dataset.board}`;
  });
});

bookmarksToggle.addEventListener("click", () => {
  bookmarkList.classList.toggle("hidden");
});

document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => closePanel(button.dataset.closePanel));
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = passwordInput.value.trim();

  if (password === adminPasswords.admin) {
    unlockDashboard("admin");
    return;
  }

  if (password === adminPasswords.developer) {
    unlockDashboard("developer");
    return;
  }

  loginStatus.textContent = "Password rejected.";
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.role);
  dashboardPanel.classList.add("hidden");
  syncSavedLoginState();
});

[readOnlyToggle, slowModeToggle, approvalToggle].forEach((toggle) => {
  toggle.addEventListener("change", () => {
    saveDashboardState({
      readOnly: readOnlyToggle.checked,
      slowMode: slowModeToggle.checked,
      approvalOnly: approvalToggle.checked,
    });
  });
});

boardSelect.addEventListener("change", renderThreadSelect);

pinThreadButton.addEventListener("click", () => {
  mutateModeration((state) => {
    state.pinned = !state.pinned;
  });
  applyModerationToThreads();
  syncDashboardData();
  renderRecentActivity();
  showDashboardNotice("Pin state updated.");
});

lockThreadButton.addEventListener("click", () => {
  mutateModeration((state) => {
    state.locked = !state.locked;
  });
  applyModerationToThreads();
  syncDashboardData();
  showDashboardNotice("Lock state updated.");
});

archiveThreadButton.addEventListener("click", () => {
  mutateModeration((state) => {
    state.archived = !state.archived;
  });
  applyModerationToThreads();
  syncDashboardData();
  renderRecentActivity();
  showDashboardNotice("Archive state updated.");
});

clearReportsButton.addEventListener("click", () => {
  saveReports([]);
  syncDashboardData();
  showDashboardNotice("Reports cleared.");
});

resetCooldownsButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.spamState);
  showDashboardNotice("Spam cooldowns reset.");
});

backupThreadsButton.addEventListener("click", () => {
  const threads = loadThreads();
  const blob = new Blob([JSON.stringify(threads, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ascendchan-threads-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
  showDashboardNotice("Thread backup downloaded.");
});

applyModerationToThreads();
applyPreferences(draftPrefs);
renderBookmarks();
renderRecentActivity();
syncSavedLoginState();

const savedRole = localStorage.getItem(storageKeys.role);
if (savedRole === "admin" || savedRole === "developer") {
  updateDashboardRole(savedRole);
  syncDashboardState();
  syncDashboardData();
}
