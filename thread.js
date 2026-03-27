const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
  threads: "ascendchan-threads",
  bookmarks: "ascendchan-bookmarks",
  reports: "ascendchan-reports",
  moderation: "ascendchan-moderation",
  spamState: "ascendchan-spam-state",
  clientId: "ascendchan-client-id",
  bans: "ascendchan-bans",
};

const defaultPrefs = {
  theme: "classic-olive",
  font: "tahoma",
  fontWeight: "regular",
  fontSize: 100,
};

const body = document.body;
const threadPageBoard = document.getElementById("threadPageBoard");
const backToBoard = document.getElementById("backToBoard");
const subnavBoardLink = document.getElementById("subnavBoardLink");
const bookmarkToggle = document.getElementById("bookmarkToggle");
const threadPagePanel = document.getElementById("threadPagePanel");
const replyBody = document.getElementById("replyBody");
const postReplyButton = document.getElementById("postReplyButton");
const cooldownNotice = document.getElementById("cooldownNotice");
const customizePanel = document.getElementById("customizePanel");
const customizeToggle = document.getElementById("customizeToggle");
const fontSelect = document.getElementById("fontSelect");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const savePreferences = document.getElementById("savePreferences");
const resetPreferences = document.getElementById("resetPreferences");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const fontWeightButtons = document.querySelectorAll("[data-font-weight]");
let draftPrefs = loadPreferences();

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

  if (fontSelect) {
    fontSelect.value = preferences.font;
    if (fontSizeRange) {
      fontSizeRange.value = String(preferences.fontSize);
    }
    if (fontSizeValue) {
      fontSizeValue.textContent = `${preferences.fontSize}%`;
    }

    themeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.themeOption === preferences.theme);
    });

    fontWeightButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.fontWeight === preferences.fontWeight,
      );
    });
  }
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

function getClientId() {
  const existing = localStorage.getItem(storageKeys.clientId);
  if (existing) {
    return existing;
  }

  const created = `CID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem(storageKeys.clientId, created);
  return created;
}

function loadBans() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.bans)) || {};
  } catch {
    return {};
  }
}

function getCurrentRole() {
  const role = localStorage.getItem(storageKeys.role);
  return role === "admin" || role === "developer" ? role : "anon";
}

function renderAuthorLabel(role) {
  if (role === "admin") {
    return "Admin";
  }
  if (role === "developer") {
    return "Developer";
  }
  return "";
}

function deletePost(postId) {
  const { board, threadData, threadMap } = findThread();
  if (!threadData) {
    return;
  }

  const threads = threadMap[board];
  const targetThread = threads.find(
    (entry) => Number(entry.threadId) === Number(threadData.threadId),
  );
  if (!targetThread) {
    return;
  }

  if (postId === targetThread.opPostId) {
    threadMap[board] = threads.filter(
      (entry) => Number(entry.threadId) !== Number(targetThread.threadId),
    );
    saveThreads(threadMap);
    window.location.href = `board.html?board=${board}`;
    return;
  }

  targetThread.replies = (targetThread.replies || []).filter((reply) => reply.postId !== postId);
  targetThread.replyCount = targetThread.replies.length;
  targetThread.updatedAt = Date.now();
  saveThreads(threadMap);
  renderThreadPage();
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

function loadSpamState() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.spamState)) || { posts: [], cooldownUntil: 0 };
  } catch {
    return { posts: [], cooldownUntil: 0 };
  }
}

function saveSpamState(state) {
  localStorage.setItem(storageKeys.spamState, JSON.stringify(state));
}

function getBanState(clientId) {
  const entry = loadBans()[clientId];
  if (!entry) {
    return { active: false };
  }

  if (entry.type === "permanent") {
    return { active: true, label: "permanent ban" };
  }

  const until = Number(entry.until || 0);
  if (until > Date.now()) {
    return {
      active: true,
      label: `${Math.ceil((until - Date.now()) / 60000)}m temp ban`,
    };
  }

  return { active: false };
}

function getCooldownStatus() {
  const now = Date.now();
  const state = loadSpamState();
  if (state.cooldownUntil && now < state.cooldownUntil) {
    return {
      active: true,
      secondsLeft: Math.ceil((state.cooldownUntil - now) / 1000),
    };
  }
  return { active: false, secondsLeft: 0 };
}

function syncCooldownUi() {
  const cooldown = getCooldownStatus();
  if (!cooldownNotice) {
    return cooldown;
  }

  cooldownNotice.classList.toggle("hidden", !cooldown.active);
  cooldownNotice.textContent = cooldown.active
    ? `Tham ja haggu ${cooldown.secondsLeft}s mai wapas try kar.`
    : "";

  replyBody.disabled = cooldown.active;
  postReplyButton.disabled = cooldown.active;
  return cooldown;
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    board: params.get("board") || "mind",
    thread: Number(params.get("thread")),
  };
}

function findThread() {
  const { board, thread } = getParams();
  const threadMap = loadThreads();
  const threads = Array.isArray(threadMap[board]) ? threadMap[board] : [];
  return {
    board,
    threadData: threads.find((entry) => Number(entry.threadId) === thread),
    threadMap,
  };
}

function formatPostId(number) {
  return String(number).padStart(3, "0");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPostBody(text) {
  return escapeHtml(text)
    .split("\n")
    .map((line) => {
      const withLinks = line.replace(
        /((https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<]*)?)/g,
        (match, url) => {
          const href = url.startsWith("http://") || url.startsWith("https://")
            ? url
            : `https://${url}`;
          return `<a class="quote-link" href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        },
      );

      const withQuotes = withLinks.replace(
        /&gt;&gt;(\d{3})/g,
        '<a class="quote-link" href="#p-$1">&gt;&gt;$1</a>',
      );

      if (line.startsWith(">") && !line.startsWith(">>")) {
        return `<span class="greentext">${withQuotes}</span>`;
      }

      return withQuotes;
    })
    .join("<br>");
}

function collectReferences(threadData) {
  const map = {};
  const posts = [{ postId: threadData.opPostId, body: threadData.body }].concat(
    threadData.replies || [],
  );

  posts.forEach((post) => {
    const matches = post.body.match(/>>\d{3}/g) || [];
    matches.forEach((match) => {
      const target = match.replace(">>", "");
      if (!map[target]) {
        map[target] = [];
      }
      map[target].push(post.postId);
    });
  });

  return map;
}

function renderBacklinks(references, postId) {
  const refs = references[postId] || [];

  if (!refs.length) {
    return "";
  }

  return `
    <div class="backlinks">
      ${refs
        .map((ref) => `<a class="quote-link" href="#p-${ref}">&gt;&gt;${ref}</a>`)
        .join(" ")}
    </div>
  `;
}

function isBookmarked(board, threadId) {
  if (!threadId) {
    return false;
  }

  const bookmarks = loadBookmarks();
  const boardBookmarks = Array.isArray(bookmarks[board]) ? bookmarks[board] : [];
  return boardBookmarks.includes(Number(threadId));
}

function toggleBookmark() {
  const { board, threadData } = findThread();

  if (!threadData) {
    return;
  }

  const bookmarks = loadBookmarks();
  const boardBookmarks = Array.isArray(bookmarks[board]) ? bookmarks[board] : [];
  const threadId = Number(threadData.threadId);
  const nextBoardBookmarks = boardBookmarks.includes(threadId)
    ? boardBookmarks.filter((id) => id !== threadId)
    : [threadId, ...boardBookmarks];

  bookmarks[board] = nextBoardBookmarks;
  saveBookmarks(bookmarks);

  if (bookmarkToggle) {
    bookmarkToggle.textContent = nextBoardBookmarks.includes(threadId)
      ? "Bookmarked"
      : "Bookmark";
  }
}

function postMenuMarkup(postId) {
  const isAdmin = getCurrentRole() === "admin";
  return `
    <div class="post-menu-wrap">
      <button class="reply-inline-button post-menu-toggle" type="button" data-menu-target="${postId}">...</button>
      <div class="post-menu hidden" id="menu-${postId}">
        <button class="reply-inline-button" type="button" data-report-post="${postId}">Report</button>
        ${isAdmin ? `<button class="reply-inline-button danger-inline-button" type="button" data-delete-post="${postId}">Delete</button>` : ""}
      </div>
    </div>
  `;
}

function renderThreadPage() {
  const { board, threadData } = findThread();
  const isAdmin = getCurrentRole() === "admin";

  threadPageBoard.textContent = `/${board}/`;
  backToBoard.href = `board.html?board=${board}`;
  if (subnavBoardLink) {
    subnavBoardLink.href = `board.html?board=${board}`;
  }
  if (bookmarkToggle) {
    bookmarkToggle.dataset.board = board;
    bookmarkToggle.dataset.thread = threadData ? String(threadData.threadId) : "";
    bookmarkToggle.textContent = isBookmarked(board, threadData?.threadId)
      ? "Bookmarked"
      : "Bookmark";
  }

  if (!threadData) {
    threadPagePanel.innerHTML =
      '<p class="empty-state">Thread not found. Go back and create one first.</p>';
    return;
  }

  const replies = Array.isArray(threadData.replies) ? threadData.replies : [];
  const references = collectReferences(threadData);
  threadPagePanel.innerHTML = `
    <div class="section-title">Thread No.${threadData.threadId}${threadData.locked ? " / locked" : ""}${threadData.pinned ? " / pinned" : ""}</div>
    <div class="thread-list">
      <article class="thread-card thread-card-op" id="p-${threadData.opPostId}">
        <div class="thread-card-head">
          ${
            renderAuthorLabel(threadData.authorRole)
              ? `<span class="thread-no">${renderAuthorLabel(threadData.authorRole)}</span>`
              : '<span class="thread-no thread-no-empty" aria-hidden="true"></span>'
          }
          <div class="post-actions">
            ${postMenuMarkup(threadData.opPostId)}
            <button class="reply-inline-button" type="button" data-reply-target="${threadData.opPostId}">Reply</button>
            ${isAdmin ? `<button class="reply-inline-button danger-inline-button" type="button" data-delete-post="${threadData.opPostId}">Delete</button>` : ""}
            <span class="post-id">${threadData.opPostId}</span>
          </div>
        </div>
        <h3>${escapeHtml(threadData.subject)}</h3>
        <p>${renderPostBody(threadData.body)}</p>
        ${renderBacklinks(references, threadData.opPostId)}
      </article>
      ${replies.length
        ? replies
            .map(
              (reply) => `
                <article class="thread-card" id="p-${reply.postId}">
                  <div class="thread-card-head">
                    ${
                      renderAuthorLabel(reply.authorRole)
                        ? `<span class="thread-no">${renderAuthorLabel(reply.authorRole)}</span>`
                        : '<span class="thread-no thread-no-empty" aria-hidden="true"></span>'
                    }
                    <div class="post-actions">
                      ${postMenuMarkup(reply.postId)}
                      <button class="reply-inline-button" type="button" data-reply-target="${reply.postId}">Reply</button>
                      ${isAdmin ? `<button class="reply-inline-button danger-inline-button" type="button" data-delete-post="${reply.postId}">Delete</button>` : ""}
                      <span class="post-id">${reply.postId}</span>
                    </div>
                  </div>
                  <p>${renderPostBody(reply.body)}</p>
                  ${renderBacklinks(references, reply.postId)}
                </article>
              `,
            )
            .join("")
        : '<p class="empty-state">No replies yet.</p>'}
    </div>
  `;
}

function reportPost(postId) {
  const { board, threadData } = findThread();
  if (!threadData) {
    return;
  }

  const targetReply = Array.isArray(threadData.replies)
    ? threadData.replies.find((reply) => reply.postId === postId)
    : null;
  const authorId = postId === threadData.opPostId
    ? threadData.authorId || "unknown"
    : targetReply?.authorId || "unknown";

  const reports = loadReports();
  reports.unshift({
    id: Date.now(),
    board,
    threadId: Number(threadData.threadId),
    postId,
    authorId,
    reason: "Reported from thread menu",
    createdAt: Date.now(),
  });
  saveReports(reports);
}

function enforceSpamCooldown() {
  const now = Date.now();
  const state = loadSpamState();

  if (state.cooldownUntil && now < state.cooldownUntil) {
    return {
      blocked: true,
      secondsLeft: Math.ceil((state.cooldownUntil - now) / 1000),
    };
  }

  const recentPosts = (state.posts || []).filter((time) => now - time < 12000);
  if (recentPosts.length >= 5) {
    saveSpamState({
      posts: recentPosts,
      cooldownUntil: now + 60000,
    });
    return { blocked: true, secondsLeft: 60 };
  }

  recentPosts.push(now);
  saveSpamState({ posts: recentPosts, cooldownUntil: 0 });
  return { blocked: false };
}

function createReply() {
  const text = replyBody.value.trim();
  const clientId = getClientId();
  const role = getCurrentRole();

  if (!text) {
    return;
  }

  if (role !== "admin") {
    const banState = getBanState(clientId);
    if (banState.active) {
      alert(`Posting blocked: ${banState.label}.`);
      return;
    }
  }

  const liveCooldown = syncCooldownUi();
  if (liveCooldown.active) {
    return;
  }

  if (role !== "admin") {
    const spamState = enforceSpamCooldown();
    if (spamState.blocked) {
      syncCooldownUi();
      return;
    }
  }

  const { board, threadData, threadMap } = findThread();

  if (!threadData) {
    return;
  }

  const threads = threadMap[board];
  const targetThread = threads.find(
    (entry) => Number(entry.threadId) === Number(threadData.threadId),
  );

  if (!targetThread) {
    return;
  }

  if (threadData.locked || targetThread.locked) {
    alert("This thread is locked.");
    return;
  }

  if (!Array.isArray(targetThread.replies)) {
    targetThread.replies = [];
  }

  const existingIds = targetThread.replies.map((reply) => Number(reply.postId));
  const nextPostNumber = existingIds.length ? Math.max(...existingIds) + 1 : 2;

  targetThread.replies.push({
    postId: formatPostId(nextPostNumber),
    authorId: clientId,
    authorRole: role,
    body: text,
    createdAt: Date.now(),
  });

  targetThread.replyCount = targetThread.replies.length;
  targetThread.updatedAt = Date.now();
  saveThreads(threadMap);
  replyBody.value = "";
  renderThreadPage();
  syncCooldownUi();
}

function openPanel(panel) {
  panel.classList.remove("hidden");
}

function closePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add("hidden");
  }
}

customizeToggle.addEventListener("click", () => {
  draftPrefs = loadPreferences();
  applyPreferences(draftPrefs);
  openPanel(customizePanel);
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

document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => closePanel(button.dataset.closePanel));
});

applyPreferences(draftPrefs);
renderThreadPage();
syncCooldownUi();
postReplyButton.addEventListener("click", createReply);
if (bookmarkToggle) {
  bookmarkToggle.addEventListener("click", toggleBookmark);
}

replyBody.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    createReply();
  }
});

window.setInterval(syncCooldownUi, 1000);

document.addEventListener("click", (event) => {
  const quoteLink = event.target.closest(".quote-link");

  if (quoteLink) {
    const href = quoteLink.getAttribute("href");
    if (href && href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        window.setTimeout(() => {
          target.classList.remove("post-highlight");
          void target.offsetWidth;
          target.classList.add("post-highlight");
          window.setTimeout(() => {
            target.classList.remove("post-highlight");
          }, 1500);
        }, 20);
      }
    }
  }

  const menuToggle = event.target.closest("[data-menu-target]");
  if (menuToggle) {
    const targetMenu = document.getElementById(`menu-${menuToggle.dataset.menuTarget}`);
    document.querySelectorAll(".post-menu").forEach((menu) => {
      if (menu !== targetMenu) {
        menu.classList.add("hidden");
      }
    });
    targetMenu?.classList.toggle("hidden");
    return;
  }

  const reportTarget = event.target.closest("[data-report-post]");
  if (reportTarget) {
    reportPost(reportTarget.dataset.reportPost);
    document.querySelectorAll(".post-menu").forEach((menu) => {
      menu.classList.add("hidden");
    });
    return;
  }

  const deleteTarget = event.target.closest("[data-delete-post]");
  if (deleteTarget) {
    deletePost(deleteTarget.dataset.deletePost);
    document.querySelectorAll(".post-menu").forEach((menu) => {
      menu.classList.add("hidden");
    });
    return;
  }

  if (!event.target.closest(".post-menu-wrap")) {
    document.querySelectorAll(".post-menu").forEach((menu) => {
      menu.classList.add("hidden");
    });
  }

  const replyTarget = event.target.closest("[data-reply-target]");
  if (!replyTarget) {
    return;
  }

  replyBody.focus();
  const quotePrefix = `>>${replyTarget.dataset.replyTarget}\n`;
  const existingText = replyBody.value.replace(/^\s+/, "");
  replyBody.value = `${quotePrefix}${existingText}`;
  replyBody.setSelectionRange(replyBody.value.length, replyBody.value.length);
});
