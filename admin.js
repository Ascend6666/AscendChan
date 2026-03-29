const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
};

const defaultPrefs = {
  theme: "classic-olive",
  font: "tahoma",
  fontWeight: "regular",
  fontSize: 100,
};

const boardKeys = ["mind", "body", "study", "skill", "grind", "social", "tech", "exam", "meta"];

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
let currentThreadRows = [];
let currentThreadDetail = null;
let currentReports = [];
let currentBans = [];

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

function getSelectedThreadRow() {
  return currentThreadRows.find((thread) => Number(thread.thread_number) === Number(adminThreadSelect.value)) || null;
}

function getSelectedReply() {
  if (!currentThreadDetail) return null;
  const selectedPost = adminPostSelect.value;
  if (!selectedPost || selectedPost === "op") return null;
  return (currentThreadDetail.replies || []).find((reply) => String(reply.post_number) === selectedPost) || null;
}

function syncThreadStateLabel() {
  const thread = getSelectedThreadRow();
  if (!thread) {
    adminThreadState.textContent = "No thread selected.";
    banTargetInput.value = "";
    return;
  }

  const labels = [];
  if (thread.pinned) labels.push("pinned");
  if (thread.locked) labels.push("locked");
  if (thread.archived) labels.push("archived");
  adminThreadState.textContent = labels.length ? labels.join(" / ") : "normal";

  const reply = getSelectedReply();
  banTargetInput.value = reply?.poster_client_id || thread.poster_client_id || "";
}

function showActionNotice(message) {
  adminActionNotice.textContent = message;
  adminActionNotice.classList.remove("hidden");
  window.clearTimeout(actionNoticeTimeout);
  actionNoticeTimeout = window.setTimeout(() => {
    adminActionNotice.classList.add("hidden");
  }, 2200);
}

function renderThreadSelect() {
  adminThreadSelect.innerHTML = currentThreadRows.length
    ? currentThreadRows.map((thread) => `<option value="${thread.thread_number}">No.${thread.thread_number} ${thread.subject}</option>`).join("")
    : '<option value="">No threads</option>';
}

function renderPostSelect() {
  if (!currentThreadDetail) {
    adminPostSelect.innerHTML = '<option value="">No posts</option>';
    syncThreadStateLabel();
    return;
  }

  const replies = currentThreadDetail.replies || [];
  adminPostSelect.innerHTML = [
    '<option value="op">OP</option>',
    ...replies.map((reply) => `<option value="${reply.post_number}">Reply ${String(reply.post_number).padStart(3, "0")}</option>`),
  ].join("");
  syncThreadStateLabel();
}

function renderReports() {
  adminReportQueue.innerHTML = currentReports.length
    ? currentReports.map((report) => `
        <div class="report-item">
          <strong>/${report.board_key}/ No.${report.thread?.thread_number || "?"} >>${String(report.target_post_number).padStart(3, "0")}</strong>
          <span>${report.reason || "Reported post"}</span>
          <div class="admin-action-row">
            <button class="utility-button" type="button" data-report-open="${report.id}">Open</button>
            <button class="utility-button" type="button" data-report-focus="${report.id}">Focus</button>
            <button class="utility-button" type="button" data-report-resolve="${report.id}">Resolve</button>
          </div>
        </div>
      `).join("")
    : '<p class="empty-state">No reports yet.</p>';
}

function renderBanList() {
  const activeBans = currentBans.filter((entry) => entry.ban_type === "permanent" || (entry.expires_at && new Date(entry.expires_at) > new Date()));
  banList.innerHTML = activeBans.length
    ? activeBans.map((entry) => `
        <div class="report-item">
          <strong>${entry.target_poster_client_id || "unknown"}</strong>
          <span>${entry.ban_type === "permanent" ? "permanent" : `until ${new Date(entry.expires_at).toLocaleString()}`}</span>
          <button class="utility-button" type="button" data-unban-id="${entry.id}">Unban</button>
        </div>
      `).join("")
    : '<p class="empty-state">No active bans.</p>';
}

async function loadThreadDetail() {
  const thread = getSelectedThreadRow();
  if (!thread) {
    currentThreadDetail = null;
    renderPostSelect();
    return;
  }

  currentThreadDetail = await window.AscendApi.getThread(thread.board_key, thread.thread_number);
  renderPostSelect();
}

async function loadBoardThreads() {
  currentThreadRows = await window.AscendApi.listAdminThreads(adminBoardSelect.value);
  renderThreadSelect();
  await loadThreadDetail();
}

async function refreshOverview() {
  const boardLists = await Promise.all(boardKeys.map((board) => window.AscendApi.listAdminThreads(board)));
  const threadCount = boardLists.reduce((sum, rows) => sum + rows.length, 0);
  const postCount = boardLists.reduce((sum, rows) => sum + rows.reduce((boardSum, row) => boardSum + 1 + Number(row.reply_count || 0), 0), 0);
  overviewThreads.textContent = String(threadCount);
  overviewPosts.textContent = String(postCount);
}

async function refreshReports() {
  try {
    currentReports = await window.AscendApi.listReports();
    overviewReports.textContent = String(currentReports.length);
    renderReports();
  } catch (error) {
    currentReports = [];
    overviewReports.textContent = "0";
    adminReportQueue.innerHTML = '<p class="empty-state">Could not load reports.</p>';
    showActionNotice(error.message || "Could not load reports.");
  }
}

async function refreshBans() {
  try {
    currentBans = await window.AscendApi.listBans();
    const activeCount = currentBans.filter((entry) => entry.ban_type === "permanent" || (entry.expires_at && new Date(entry.expires_at) > new Date())).length;
    overviewBans.textContent = String(activeCount);
    renderBanList();
  } catch (error) {
    currentBans = [];
    overviewBans.textContent = "0";
    banList.innerHTML = '<p class="empty-state">Could not load bans.</p>';
    showActionNotice(error.message || "Could not load bans.");
  }
}

async function refreshAll() {
  await Promise.allSettled([refreshOverview(), refreshReports(), refreshBans()]);
  await loadBoardThreads();
}

async function toggleThreadFlag(flag) {
  const thread = getSelectedThreadRow();
  if (!thread) return;

  await window.AscendApi.setThreadFlags(thread.board_key, thread.thread_number, {
    [flag]: !thread[flag],
  });
  await refreshAll();
  showActionNotice(`Thread No.${thread.thread_number} updated.`);
}

async function deleteSelectedPost() {
  const thread = getSelectedThreadRow();
  if (!thread || !currentThreadDetail) return;

  const selectedPost = adminPostSelect.value;
  if (!selectedPost || selectedPost === "op") {
    await deleteSelectedThread();
    return;
  }

  await window.AscendApi.deletePost(thread.board_key, thread.thread_number, selectedPost);
  await refreshAll();
  showActionNotice(`Reply ${String(selectedPost).padStart(3, "0")} deleted.`);
}

async function deleteSelectedThread() {
  const thread = getSelectedThreadRow();
  if (!thread) return;

  await window.AscendApi.deleteThread(thread.board_key, thread.thread_number);
  await refreshAll();
  showActionNotice(`Thread No.${thread.thread_number} archived.`);
}

async function applyBan(type) {
  const clientId = banTargetInput.value.trim();
  if (!clientId) return;
  const minutes = Math.max(1, Number(tempBanMinutes.value) || 60);
  await window.AscendApi.applyBan(clientId, type, minutes);
  await refreshBans();
  showActionNotice(type === "permanent" ? `${clientId} permanently banned.` : `${clientId} temp banned.`);
}

async function removeBan(banId) {
  if (!banId) return;
  await window.AscendApi.removeBan(banId);
  await refreshBans();
  showActionNotice("Ban removed.");
}

async function initAdmin() {
  const authState = await window.AscendAuth.refreshRole();
  if (authState.role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  applyPreferences(draftPrefs);
  await refreshAll();
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

adminLogoutButton.addEventListener("click", async () => {
  await window.AscendAuth.signOut();
  localStorage.removeItem(storageKeys.role);
  window.location.href = "index.html";
});

adminBoardSelect.addEventListener("change", () => {
  loadBoardThreads().catch((error) => showActionNotice(error.message || "Could not load board threads."));
});

adminThreadSelect.addEventListener("change", () => {
  loadThreadDetail().catch((error) => showActionNotice(error.message || "Could not load thread."));
});

adminPostSelect.addEventListener("change", syncThreadStateLabel);

adminPinThreadButton.addEventListener("click", () => {
  toggleThreadFlag("pinned").catch((error) => showActionNotice(error.message || "Could not update thread."));
});
adminLockThreadButton.addEventListener("click", () => {
  toggleThreadFlag("locked").catch((error) => showActionNotice(error.message || "Could not update thread."));
});
adminArchiveThreadButton.addEventListener("click", () => {
  toggleThreadFlag("archived").catch((error) => showActionNotice(error.message || "Could not update thread."));
});
adminDeletePostButton.addEventListener("click", () => {
  deleteSelectedPost().catch((error) => showActionNotice(error.message || "Could not delete post."));
});
adminDeleteThreadButton.addEventListener("click", () => {
  deleteSelectedThread().catch((error) => showActionNotice(error.message || "Could not delete thread."));
});
tempBanButton.addEventListener("click", () => {
  applyBan("temporary").catch((error) => showActionNotice(error.message || "Could not apply ban."));
});
permaBanButton.addEventListener("click", () => {
  applyBan("permanent").catch((error) => showActionNotice(error.message || "Could not apply ban."));
});
unbanButton.addEventListener("click", () => {
  const match = currentBans.find((entry) => entry.target_poster_client_id === banTargetInput.value.trim());
  if (!match) {
    showActionNotice("No active ban found for that client ID.");
    return;
  }
  removeBan(match.id).catch((error) => showActionNotice(error.message || "Could not remove ban."));
});
clearAllReportsButton.addEventListener("click", async () => {
  for (const report of currentReports) {
    await window.AscendApi.resolveReport(report.id);
  }
  await refreshReports();
  showActionNotice("All open reports resolved.");
});

document.addEventListener("click", (event) => {
  const resolveButton = event.target.closest("[data-report-resolve]");
  if (resolveButton) {
    window.AscendApi.resolveReport(Number(resolveButton.dataset.reportResolve))
      .then(refreshReports)
      .then(() => showActionNotice("Report resolved."))
      .catch((error) => showActionNotice(error.message || "Could not resolve report."));
    return;
  }

  const focusButton = event.target.closest("[data-report-focus]");
  if (focusButton) {
    const report = currentReports.find((entry) => Number(entry.id) === Number(focusButton.dataset.reportFocus));
    if (!report?.thread?.thread_number) return;
    adminBoardSelect.value = report.board_key;
    loadBoardThreads()
      .then(() => {
        adminThreadSelect.value = String(report.thread.thread_number);
        return loadThreadDetail();
      })
      .then(() => {
        adminPostSelect.value = String(report.target_post_number);
        syncThreadStateLabel();
        showActionNotice(`Focused /${report.board_key}/ No.${report.thread.thread_number}.`);
      })
      .catch((error) => showActionNotice(error.message || "Could not focus report."));
    return;
  }

  const openButton = event.target.closest("[data-report-open]");
  if (openButton) {
    const report = currentReports.find((entry) => Number(entry.id) === Number(openButton.dataset.reportOpen));
    if (!report) return;
    const openThread = report.thread?.thread_number
      ? Promise.resolve(report.thread)
      : window.AscendApi.getThreadNumberById(report.thread_id);

    openThread
      .then((thread) => {
        if (!thread?.thread_number) {
          throw new Error("No thread exists for this report anymore.");
        }
        window.location.href = `thread.html?board=${report.board_key}&thread=${thread.thread_number}`;
      })
      .catch((error) => showActionNotice(error.message || "Could not open report thread."));
    return;
  }

  const unbanButtonInline = event.target.closest("[data-unban-id]");
  if (unbanButtonInline) {
    removeBan(Number(unbanButtonInline.dataset.unbanId)).catch((error) => showActionNotice(error.message || "Could not remove ban."));
  }
});

initAdmin().catch((error) => {
  showActionNotice(error.message || "Admin init failed.");
  window.setTimeout(() => {
    window.location.href = "index.html";
  }, 1200);
});
