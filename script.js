const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
};

const defaultPrefs = { theme: "classic-olive", font: "tahoma", fontWeight: "regular", fontSize: 100 };
const adminPasswords = { admin: "sarthak@ascend666", developer: "ascend-dev" };

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
const noticeboardDisplay = document.getElementById("noticeboardDisplay");

let draftPrefs = loadPreferences();

function loadPreferences() {
  return {
    theme: localStorage.getItem(storageKeys.theme) || defaultPrefs.theme,
    font: localStorage.getItem(storageKeys.font) || defaultPrefs.font,
    fontWeight: localStorage.getItem(storageKeys.fontWeight) || defaultPrefs.fontWeight,
    fontSize: Number(localStorage.getItem(storageKeys.fontSize)) || defaultPrefs.fontSize,
  };
}

function applyPreferences(preferences) {
  body.dataset.theme = preferences.theme;
  body.dataset.font = preferences.font;
  body.dataset.fontWeight = preferences.fontWeight;
  body.style.setProperty("--content-font-scale", String(preferences.fontSize / 100));
  fontSelect.value = preferences.font;
  fontSizeRange.value = String(preferences.fontSize);
  fontSizeValue.textContent = `${preferences.fontSize}%`;
  themeButtons.forEach((button) => button.classList.toggle("active", button.dataset.themeOption === preferences.theme));
  fontWeightButtons.forEach((button) => button.classList.toggle("active", button.dataset.fontWeight === preferences.fontWeight));
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

function openPanel(panel) {
  [customizePanel, loginPanel, dashboardPanel].forEach((item) => item.classList.add("hidden"));
  panel.classList.remove("hidden");
}

function closePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add("hidden");
}

function updateDashboardRole(role) {
  dashboardRole.textContent = `${role} mode unlocked`;
  roleDescription.textContent = role === "admin"
    ? "Admin access is now routed through the separate admin page."
    : "Developer can access lightweight local tooling on this front page.";
}

function unlockDashboard(role) {
  localStorage.setItem(storageKeys.role, role);
  if (role === "admin") {
    window.location.href = "admin.html";
    return;
  }
  updateDashboardRole(role);
  openPanel(dashboardPanel);
  loginStatus.textContent = `${role} login successful.`;
  passwordInput.value = "";
  syncSavedLoginState();
  syncNoticeboardEditor();
}

async function renderBookmarks() {
  try {
    const bookmarks = await window.AscendApi.listBookmarks();
    bookmarkList.innerHTML = bookmarks.length
      ? bookmarks.map((thread) => `<a href="thread.html?board=${thread.board_key}&thread=${thread.thread_number}">/${thread.board_key}/ No.${thread.thread_number} ${thread.subject}</a>`).join("")
      : '<p class="empty-state">No bookmarked threads.</p>';
  } catch {
    bookmarkList.innerHTML = '<p class="empty-state">Could not load bookmarks.</p>';
  }
}

async function renderRecentActivity() {
  try {
    const activity = await window.AscendApi.listRecentThreads(8);
    recentList.innerHTML = activity.length
      ? activity.map((entry) => `<a href="thread.html?board=${entry.board_key}&thread=${entry.thread_number}">/${entry.board_key}/ No.${entry.thread_number} ${entry.subject}</a>`).join("")
      : '<p class="empty-state">No Recent Activity :(</p>';
  } catch {
    recentList.innerHTML = '<p class="empty-state">Could not load recent activity.</p>';
  }
}

function syncSavedLoginState() {
  const savedRole = localStorage.getItem(storageKeys.role);
  loginToggle.textContent = savedRole === "admin" ? "Admin" : savedRole === "developer" ? "Developer" : "Login";
}

async function renderNoticeboard() {
  if (!noticeboardDisplay) return;
  noticeboardDisplay.textContent = "Loading notice...";
  try {
    const data = await window.AscendApi.getNoticeboard();
    const text = data?.body || "Welcome to Ascend Chan.";
    noticeboardDisplay.textContent = text;
    if (noticeboardInput) noticeboardInput.value = text;
  } catch {
    noticeboardDisplay.textContent = "Welcome to Ascend Chan.";
  }
}


customizeToggle.addEventListener("click", () => {
  draftPrefs = loadPreferences();
  applyPreferences(draftPrefs);
  openPanel(customizePanel);
});
loginToggle.addEventListener("click", () => {
  const role = localStorage.getItem(storageKeys.role);
  if (role === "admin") {
    window.location.href = "admin.html";
    return;
  }
  if (role === "developer") {
    updateDashboardRole("developer");
    openPanel(dashboardPanel);
    return;
  }
  loginStatus.textContent = "Use developer or admin password to unlock moderation tools.";
  passwordInput.value = "";
  openPanel(loginPanel);
});
themeButtons.forEach((button) => button.addEventListener("click", () => {
  draftPrefs = { ...draftPrefs, theme: button.dataset.themeOption };
  applyPreferences(draftPrefs);
}));
fontSelect.addEventListener("change", (event) => {
  draftPrefs = { ...draftPrefs, font: event.target.value };
  applyPreferences(draftPrefs);
});
fontSizeRange.addEventListener("input", (event) => {
  draftPrefs = { ...draftPrefs, fontSize: Number(event.target.value) };
  applyPreferences(draftPrefs);
});
fontWeightButtons.forEach((button) => button.addEventListener("click", () => {
  draftPrefs = { ...draftPrefs, fontWeight: button.dataset.fontWeight };
  applyPreferences(draftPrefs);
}));
savePreferences.addEventListener("click", () => {
  persistPreferences(draftPrefs);
  customizePanel.classList.add("hidden");
});
resetPreferences.addEventListener("click", resetPreferencesToDefault);
boardRows.forEach((row) => row.addEventListener("click", () => {
  window.location.href = `board.html?board=${row.dataset.board}`;
}));
bookmarksToggle.addEventListener("click", () => bookmarkList.classList.toggle("hidden"));
document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => closePanel(button.dataset.closePanel));
});
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = passwordInput.value.trim();
  if (password === adminPasswords.admin) return unlockDashboard("admin");
  if (password === adminPasswords.developer) return unlockDashboard("developer");
  loginStatus.textContent = "Password rejected.";
});
logoutButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.role);
  dashboardPanel.classList.add("hidden");
  syncSavedLoginState();
});

applyPreferences(draftPrefs);
syncSavedLoginState();
renderNoticeboard();
renderBookmarks();
renderRecentActivity();
