const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
  threads: "ascendchan-threads",
  reports: "ascendchan-reports",
  bookmarks: "ascendchan-bookmarks",
  bans: "ascendchan-bans",
  moderation: "ascendchan-moderation",
  spamState: "ascendchan-spam-state",
};

const defaultPrefs = {
  theme: "classic-olive",
  font: "tahoma",
  fontWeight: "regular",
  fontSize: 100,
};

const body = document.body;
const customizePanel = document.getElementById("customizePanel");
const customizeToggle = document.getElementById("customizeToggle");
const adminLogoutButton = document.getElementById("adminLogoutButton");
const fontSelect = document.getElementById("fontSelect");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const savePreferences = document.getElementById("savePreferences");
const resetPreferences = document.getElementById("resetPreferences");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const fontWeightButtons = document.querySelectorAll("[data-font-weight]");
const adminReportQueue = document.getElementById("adminReportQueue");
const adminBoardSelect = document.getElementById("adminBoardSelect");
const adminThreadSelect = document.getElementById("adminThreadSelect");
const adminPostSelect = document.getElementById("adminPostSelect");
const adminThreadState = document.getElementById("adminThreadState");
const adminPinThreadButton = document.getElementById("adminPinThreadButton");
const adminLockThreadButton = document.getElementById("adminLockThreadButton");
const adminArchiveThreadButton = document.getElementById("adminArchiveThreadButton");
const adminDeletePostButton = document.getElementById("adminDeletePostButton");
const adminDeleteThreadButton = document.getElementById("adminDeleteThreadButton");
const banTargetInput = document.getElementById("banTargetInput");
const tempBanMinutes = document.getElementById("tempBanMinutes");
const tempBanButton = document.getElementById("tempBanButton");
const permaBanButton = document.getElementById("permaBanButton");
const unbanButton = document.getElementById("unbanButton");
const banList = document.getElementById("banList");
const clearAllReportsButton = document.getElementById("clearAllReportsButton");
const overviewThreads = document.getElementById("overviewThreads");
const overviewPosts = document.getElementById("overviewPosts");
const overviewReports = document.getElementById("overviewReports");
const overviewBans = document.getElementById("overviewBans");
const adminActionNotice = document.getElementById("adminActionNotice");

let draftPrefs = loadPreferences();
let actionNoticeTimeout;

if (localStorage.getItem(storageKeys.role) !== "admin") {
  window.location.href = "index.html";
}

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
  fontSizeRange.value = String(preferences.fontSize);
  fontSizeValue.textContent = `${preferences.fontSize}%`;

  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeOption === preferences.theme);
  });

  fontWeightButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.fontWeight === preferences.fontWeight);
  });
}

function persistPreferences(preferences) {
  localStorage.setItem(storageKeys.theme, preferences.theme);
  localStorage.setItem(storageKeys.font, preferences.font);
  localStorage.setItem(storageKeys.fontWeight, preferences.fontWeight);
  localStorage.setItem(storageKeys.fontSize, String(preferences.fontSize));
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

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.bookmarks)) || {};
  } catch {
    return {};
  }
}

function saveBookmarks(bookmarkMap) {
  localStorage.setItem(storageKeys.bookmarks, JSON.stringify(bookmarkMap));
}

function loadBans() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.bans)) || {};
  } catch {
    return {};
  }
}

function saveBans(banMap) {
  localStorage.setItem(storageKeys.bans, JSON.stringify(banMap));
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

function getBoardThreads(board) {
  const threadMap = loadThreads();
  return Array.isArray(threadMap[board]) ? threadMap[board] : [];
}

function getSelectedThreadRef() {
  const board = adminBoardSelect.value;
  const threadId = Number(adminThreadSelect.value);
  if (!threadId) {
    return null;
  }

  const threadMap = loadThreads();
  const boardThreads = Array.isArray(threadMap[board]) ? threadMap[board] : [];
  const thread = boardThreads.find((entry) => Number(entry.threadId) === threadId);
  if (!thread) {
    return null;
  }

  return { board, threadId, thread, threadMap, boardThreads };
}

function getSelectedPostRef() {
  const selectedThread = getSelectedThreadRef();
  if (!selectedThread) {
    return null;
  }

  const postId = adminPostSelect.value;
  if (!postId) {
    return null;
  }

  if (postId === selectedThread.thread.opPostId) {
    return {
      ...selectedThread,
      postId,
      post: {
        postId,
        authorId: selectedThread.thread.authorId || "unknown",
        isOp: true,
      },
    };
  }

  const reply = Array.isArray(selectedThread.thread.replies)
    ? selectedThread.thread.replies.find((entry) => entry.postId === postId)
    : null;
  if (!reply) {
    return null;
  }

  return {
    ...selectedThread,
    postId,
    post: {
      ...reply,
      isOp: false,
    },
  };
}

function syncThreadStateLabel() {
  const selected = getSelectedThreadRef();
  if (!selected) {
    adminThreadState.textContent = "No thread selected.";
    banTargetInput.value = "";
    return;
  }

  const labels = [];
  if (selected.thread.pinned) {
    labels.push("pinned");
  }
  if (selected.thread.locked) {
    labels.push("locked");
  }
  if (selected.thread.archived) {
    labels.push("archived");
  }
  adminThreadState.textContent = labels.length ? labels.join(" / ") : "normal";

  const postRef = getSelectedPostRef();
  banTargetInput.value = postRef?.post?.authorId || "";
}

function renderThreadSelect() {
  const threads = getBoardThreads(adminBoardSelect.value);
  adminThreadSelect.innerHTML = threads.length
    ? threads.map((thread) => `<option value="${thread.threadId}">No.${thread.threadId} ${thread.subject}</option>`).join("")
    : '<option value="">No threads</option>';
  renderPostSelect();
}

function renderPostSelect() {
  const selected = getSelectedThreadRef();
  if (!selected) {
    adminPostSelect.innerHTML = '<option value="">No posts</option>';
    syncThreadStateLabel();
    return;
  }

  const replies = Array.isArray(selected.thread.replies) ? selected.thread.replies : [];
  adminPostSelect.innerHTML = [
    `<option value="${selected.thread.opPostId}">OP ${selected.thread.opPostId}</option>`,
    ...replies.map((reply) => `<option value="${reply.postId}">Reply ${reply.postId}</option>`),
  ].join("");
  syncThreadStateLabel();
}

function renderOverview() {
  const threads = loadThreads();
  const reports = loadReports();
  const bans = loadBans();
  const threadCount = Object.values(threads).reduce((sum, boardThreads) => sum + boardThreads.length, 0);
  const postCount = Object.values(threads).reduce(
    (sum, boardThreads) =>
      sum + boardThreads.reduce((boardSum, thread) => boardSum + 1 + (thread.replies?.length || 0), 0),
    0,
  );
  const activeBans = Object.values(bans).filter((entry) => entry.type === "permanent" || Number(entry.until || 0) > Date.now()).length;

  overviewThreads.textContent = String(threadCount);
  overviewPosts.textContent = String(postCount);
  overviewReports.textContent = String(reports.length);
  overviewBans.textContent = String(activeBans);
}

function renderReports() {
  const reports = loadReports();
  adminReportQueue.innerHTML = reports.length
    ? reports
        .map(
          (report) => `
            <div class="report-item">
              <strong>/${report.board}/ No.${report.threadId} >>${report.postId}</strong>
              <span>${report.authorId || "unknown"}</span>
              <div class="admin-action-row">
                <a class="utility-button" href="thread.html?board=${report.board}&thread=${report.threadId}">Open</a>
                <button class="utility-button" type="button" data-report-focus="${report.id}">Focus</button>
                <button class="utility-button" type="button" data-report-resolve="${report.id}">Resolve</button>
              </div>
            </div>
          `,
        )
        .join("")
    : '<p class="empty-state">No reports yet.</p>';
}

function renderBanList() {
  const bans = loadBans();
  const entries = Object.entries(bans).filter(([, entry]) => entry.type === "permanent" || Number(entry.until || 0) > Date.now());
  banList.innerHTML = entries.length
    ? entries
        .map(([clientId, entry]) => {
          const label = entry.type === "permanent"
            ? "permanent"
            : `until ${new Date(entry.until).toLocaleString()}`;
          return `
            <div class="report-item">
              <strong>${clientId}</strong>
              <span>${label}</span>
              <button class="utility-button" type="button" data-unban-client="${clientId}">Unban</button>
            </div>
          `;
        })
        .join("")
    : '<p class="empty-state">No active bans.</p>';
}

function renderAll() {
  renderOverview();
  renderReports();
  renderThreadSelect();
  renderBanList();
}

function showActionNotice(message) {
  if (!adminActionNotice) {
    return;
  }

  adminActionNotice.textContent = message;
  adminActionNotice.classList.remove("hidden");
  window.clearTimeout(actionNoticeTimeout);
  actionNoticeTimeout = window.setTimeout(() => {
    adminActionNotice.classList.add("hidden");
  }, 2200);
}

function syncModerationMirror(thread) {
  const moderation = loadModeration();
  const board = adminBoardSelect.value;
  moderation[board] = moderation[board] || {};
  moderation[board][thread.threadId] = moderation[board][thread.threadId] || {};
  moderation[board][thread.threadId].pinned = Boolean(thread.pinned);
  moderation[board][thread.threadId].locked = Boolean(thread.locked);
  moderation[board][thread.threadId].archived = Boolean(thread.archived);
  saveModeration(moderation);
}

function removeReportsFor(board, threadId, postId) {
  const filtered = loadReports().filter((report) => {
    if (report.board !== board || Number(report.threadId) !== Number(threadId)) {
      return true;
    }
    if (!postId) {
      return false;
    }
    return report.postId !== postId;
  });
  saveReports(filtered);
}

function removeBookmarksFor(board, threadId) {
  const bookmarks = loadBookmarks();
  const boardBookmarks = Array.isArray(bookmarks[board]) ? bookmarks[board] : [];
  bookmarks[board] = boardBookmarks.filter((id) => Number(id) !== Number(threadId));
  saveBookmarks(bookmarks);
}

function toggleThreadFlag(flag) {
  const selected = getSelectedThreadRef();
  if (!selected) {
    return;
  }
  selected.thread[flag] = !selected.thread[flag];
  saveThreads(selected.threadMap);
  syncModerationMirror(selected.thread);
  renderAll();
  showActionNotice(`Thread No.${selected.threadId} ${selected.thread[flag] ? flag + " enabled" : flag + " removed"}.`);
}

function deleteSelectedPost() {
  const selected = getSelectedPostRef();
  if (!selected) {
    return;
  }

  if (selected.post.isOp) {
    deleteSelectedThread();
    return;
  }

  selected.thread.replies = selected.thread.replies.filter((reply) => reply.postId !== selected.postId);
  selected.thread.replyCount = selected.thread.replies.length;
  selected.thread.updatedAt = Date.now();
  saveThreads(selected.threadMap);
  removeReportsFor(selected.board, selected.threadId, selected.postId);
  renderAll();
  showActionNotice(`Post ${selected.postId} deleted from /${selected.board}/.`);
}

function deleteSelectedThread() {
  const selected = getSelectedThreadRef();
  if (!selected) {
    return;
  }

  selected.threadMap[selected.board] = selected.boardThreads.filter((thread) => Number(thread.threadId) !== Number(selected.threadId));
  saveThreads(selected.threadMap);
  removeReportsFor(selected.board, selected.threadId);
  removeBookmarksFor(selected.board, selected.threadId);
  renderAll();
  showActionNotice(`Thread No.${selected.threadId} deleted from /${selected.board}/.`);
}

function applyBan(type) {
  const clientId = banTargetInput.value.trim();
  if (!clientId) {
    return;
  }

  const bans = loadBans();
  if (type === "permanent") {
    bans[clientId] = { type: "permanent", createdAt: Date.now() };
  } else {
    const minutes = Math.max(1, Number(tempBanMinutes.value) || 60);
    bans[clientId] = {
      type: "temporary",
      until: Date.now() + minutes * 60 * 1000,
      createdAt: Date.now(),
    };
  }
  saveBans(bans);
  renderAll();
  showActionNotice(
    type === "permanent"
      ? `${clientId} permanently banned.`
      : `${clientId} temp banned for ${Math.max(1, Number(tempBanMinutes.value) || 60)} minute(s).`,
  );
}

function removeBan(clientId) {
  const bans = loadBans();
  delete bans[clientId];
  saveBans(bans);
  renderAll();
  showActionNotice(`${clientId} unbanned.`);
}

customizeToggle.addEventListener("click", () => {
  draftPrefs = loadPreferences();
  applyPreferences(draftPrefs);
  customizePanel.classList.remove("hidden");
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

fontSizeRange.addEventListener("input", (event) => {
  draftPrefs = { ...draftPrefs, fontSize: Number(event.target.value) };
  applyPreferences(draftPrefs);
});

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
  draftPrefs = { ...defaultPrefs };
  applyPreferences(draftPrefs);
  persistPreferences(draftPrefs);
});

document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    customizePanel.classList.add("hidden");
  });
});

adminLogoutButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.role);
  window.location.href = "index.html";
});

adminBoardSelect.addEventListener("change", renderThreadSelect);
adminThreadSelect.addEventListener("change", renderPostSelect);
adminPostSelect.addEventListener("change", syncThreadStateLabel);

adminPinThreadButton.addEventListener("click", () => toggleThreadFlag("pinned"));
adminLockThreadButton.addEventListener("click", () => toggleThreadFlag("locked"));
adminArchiveThreadButton.addEventListener("click", () => toggleThreadFlag("archived"));
adminDeletePostButton.addEventListener("click", deleteSelectedPost);
adminDeleteThreadButton.addEventListener("click", deleteSelectedThread);
tempBanButton.addEventListener("click", () => applyBan("temporary"));
permaBanButton.addEventListener("click", () => applyBan("permanent"));
unbanButton.addEventListener("click", () => removeBan(banTargetInput.value.trim()));
clearAllReportsButton.addEventListener("click", () => {
  saveReports([]);
  renderAll();
  showActionNotice("All reports cleared.");
});

document.addEventListener("click", (event) => {
  const resolveButton = event.target.closest("[data-report-resolve]");
  if (resolveButton) {
    const reportId = Number(resolveButton.dataset.reportResolve);
    saveReports(loadReports().filter((report) => Number(report.id) !== reportId));
    renderAll();
    showActionNotice("Report resolved.");
    return;
  }

  const focusButton = event.target.closest("[data-report-focus]");
  if (focusButton) {
    const report = loadReports().find((entry) => Number(entry.id) === Number(focusButton.dataset.reportFocus));
    if (!report) {
      return;
    }
    adminBoardSelect.value = report.board;
    renderThreadSelect();
    adminThreadSelect.value = String(report.threadId);
    renderPostSelect();
    adminPostSelect.value = String(report.postId);
    syncThreadStateLabel();
    showActionNotice(`Focused /${report.board}/ No.${report.threadId} >>${report.postId}.`);
    return;
  }

  const unbanClientButton = event.target.closest("[data-unban-client]");
  if (unbanClientButton) {
    removeBan(unbanClientButton.dataset.unbanClient);
  }
});

applyPreferences(draftPrefs);
renderAll();
