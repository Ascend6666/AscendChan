const boardMeta = {
  mind: {
    title: "/mind/",
    description:
      "Philosophy, psychology, mental models, and whatever else keeps you awake.",
  },
  body: {
    title: "/body/",
    description: "Training, food, sleep, and fixing your physical form slowly.",
  },
  study: {
    title: "/study/",
    description: "Techniques, notes, and trying not to waste your semester.",
  },
  skill: {
    title: "/skill/",
    description: "Discuss and share real life skills which can help fellow netizens.",
  },
  grind: {
    title: "/grind/",
    description: "Work sessions, discipline, streaks, to track your path.",
  },
  social: {
    title: "/social/",
    description: "Friendships, communication, loneliness, and real-world awkwardness.",
  },
  tech: {
    title: "/tech/",
    description: "Programming, tools, terminals, and side projects.",
  },
  exam: {
    title: "/exam/",
    description: "Test prep, panic control, revision plans, and deadline survival.",
  },
  meta: {
    title: "/meta/",
    description: "Requests, feedback, bugs, and moderation.",
  },
};

const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
  threads: "ascendchan-threads",
  bookmarks: "ascendchan-bookmarks",
  threadView: "ascendchan-thread-view",
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
const boardTitle = document.getElementById("boardTitle");
const boardCode = document.getElementById("boardCode");
const boardDescription = document.getElementById("boardDescription");
const threadList = document.getElementById("threadList");
const bookmarkThreads = document.getElementById("bookmarkThreads");
const catalogGrid = document.getElementById("catalogGrid");
const catalogPanel = document.getElementById("catalogPanel");
const threadSearch = document.getElementById("threadSearch");
const threadFilter = document.getElementById("threadFilter");
const toggleComposer = document.getElementById("toggleComposer");
const threadComposer = document.getElementById("threadComposer");
const threadSubject = document.getElementById("threadSubject");
const threadBody = document.getElementById("threadBody");
const postThreadButton = document.getElementById("postThreadButton");
const listViewButton = document.getElementById("listViewButton");
const catalogViewButton = document.getElementById("catalogViewButton");
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
let currentView = localStorage.getItem(storageKeys.threadView) || "list";
const currentBoard = getCurrentBoard();

function getCurrentBoard() {
  const params = new URLSearchParams(window.location.search);
  const board = params.get("board");
  return boardMeta[board] ? board : "mind";
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

function loadThreads() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.threads)) || {};
  } catch {
    return {};
  }
}

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.bookmarks)) || {};
  } catch {
    return {};
  }
}

function saveThreads(threadMap) {
  localStorage.setItem(storageKeys.threads, JSON.stringify(threadMap));
}

function saveBookmarks(bookmarkMap) {
  localStorage.setItem(storageKeys.bookmarks, JSON.stringify(bookmarkMap));
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

function deleteThread(threadId) {
  const threadMap = loadThreads();
  const boardThreads = Array.isArray(threadMap[currentBoard]) ? threadMap[currentBoard] : [];
  threadMap[currentBoard] = boardThreads.filter((thread) => Number(thread.threadId) !== Number(threadId));
  saveThreads(threadMap);

  const bookmarks = loadBookmarks();
  const boardBookmarks = Array.isArray(bookmarks[currentBoard]) ? bookmarks[currentBoard] : [];
  bookmarks[currentBoard] = boardBookmarks.filter((id) => Number(id) !== Number(threadId));
  saveBookmarks(bookmarks);

  renderBookmarks();
  renderThreads();
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

function getThreadsForBoard(board) {
  const threadMap = loadThreads();
  return Array.isArray(threadMap[board]) ? threadMap[board] : [];
}

function sortThreads(threads) {
  return threads.sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) {
      return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    }
    return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
  });
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

function buildThreadId(boardThreads) {
  const maxId = boardThreads.reduce(
    (highest, thread) => Math.max(highest, Number(thread.threadId || 0)),
    0,
  );
  return maxId + 1;
}

function formatPostId(number) {
  return String(number).padStart(3, "0");
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
    button.classList.toggle("active", button.dataset.themeOption === preferences.theme);
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

function formatThreadState(thread) {
  const labels = [];
  if (thread.pinned) {
    labels.push("pinned");
  }
  if (thread.locked) {
    labels.push("locked");
  }
  if (thread.archived) {
    labels.push("archived");
  }
  return labels.length ? labels.join(" / ") : `${thread.replyCount || 0} replies`;
}

function isBookmarked(threadId) {
  const bookmarks = loadBookmarks();
  const boardBookmarks = Array.isArray(bookmarks[currentBoard]) ? bookmarks[currentBoard] : [];
  return boardBookmarks.includes(Number(threadId));
}

function renderThreadCards(threads, emptyMessage) {
  if (!threads.length) {
    return `<p class="empty-state">${emptyMessage}</p>`;
  }

  const isAdmin = getCurrentRole() === "admin";

  return threads
    .map(
      (thread) => `
        <article class="thread-card thread-card-link thread-card-compact board-thread-card" data-thread-link="${thread.threadId}">
          <div class="thread-card-head">
            <span class="thread-no">No.${thread.threadId}</span>
            <div class="post-actions">
              <button class="reply-inline-button bookmark-inline-button" type="button" data-bookmark-thread="${thread.threadId}">
                ${isBookmarked(thread.threadId) ? "Bookmarked" : "Bookmark"}
              </button>
              ${isAdmin ? `<button class="reply-inline-button danger-inline-button" type="button" data-delete-thread="${thread.threadId}">Delete</button>` : ""}
            </div>
          </div>
          <h3>${thread.subject}</h3>
          <div class="thread-card-foot">
            <span>${formatThreadState(thread)}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderCatalog(threads) {
  if (!threads.length) {
    catalogGrid.innerHTML = '<p class="empty-state">No threads yet.</p>';
    return;
  }

  const isAdmin = getCurrentRole() === "admin";

  catalogGrid.innerHTML = threads
    .map(
      (thread) => `
        <article class="thread-card catalog-card" data-thread-link="${thread.threadId}">
          <div class="thread-card-head">
            <span class="thread-no">No.${thread.threadId}</span>
            <div class="post-actions">
              <button class="reply-inline-button bookmark-inline-button" type="button" data-bookmark-thread="${thread.threadId}">
                ${isBookmarked(thread.threadId) ? "Bookmarked" : "Bookmark"}
              </button>
              ${isAdmin ? `<button class="reply-inline-button danger-inline-button" type="button" data-delete-thread="${thread.threadId}">Delete</button>` : ""}
            </div>
          </div>
          <h3>${thread.subject}</h3>
          <p>${formatThreadState(thread)}</p>
        </article>
      `,
    )
    .join("");
}

function renderBookmarks() {
  const bookmarks = loadBookmarks();
  const boardBookmarkIds = Array.isArray(bookmarks[currentBoard])
    ? bookmarks[currentBoard]
    : [];
  const bookmarkedThreads = sortThreads(
    getThreadsForBoard(currentBoard).filter((thread) =>
      boardBookmarkIds.includes(Number(thread.threadId)),
    ),
  );

  bookmarkThreads.innerHTML = renderThreadCards(
    bookmarkedThreads,
    "No bookmarks on this board.",
  );
}

function filterThreads() {
  const query = threadSearch.value.trim().toLowerCase();
  const filter = threadFilter.value;
  let threads = [...getThreadsForBoard(currentBoard)].filter((thread) => !thread.archived);

  if (query) {
    threads = threads.filter((thread) => thread.subject.toLowerCase().includes(query));
  }

  if (filter === "active") {
    threads.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
  } else if (filter === "new") {
    threads.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  } else if (filter === "unanswered") {
    threads = threads.filter((thread) => (thread.replyCount || 0) === 0);
    sortThreads(threads);
  } else {
    sortThreads(threads);
  }

  return threads;
}

function renderThreads() {
  const threads = filterThreads();
  threadList.innerHTML = renderThreadCards(threads, "No threads yet.");
  renderCatalog(threads);
}

function syncViewMode() {
  const catalogMode = currentView === "catalog";
  catalogPanel.classList.toggle("hidden", !catalogMode);
  threadList.parentElement.classList.toggle("hidden", catalogMode);
  listViewButton.classList.toggle("primary-button", !catalogMode);
  catalogViewButton.classList.toggle("primary-button", catalogMode);
}

function createThread() {
  const subject = threadSubject.value.trim();
  const post = threadBody.value.trim();
  const clientId = getClientId();
  const role = getCurrentRole();

  if (!subject || !post) {
    return;
  }

  if (role !== "admin") {
    const banState = getBanState(clientId);
    if (banState.active) {
      alert(`Posting blocked: ${banState.label}.`);
      return;
    }

    const spamState = enforceSpamCooldown();
    if (spamState.blocked) {
      alert(`Tham ja haggu ${spamState.secondsLeft}s mai wapas try kar.`);
      return;
    }
  }

  const threadMap = loadThreads();
  const boardThreads = Array.isArray(threadMap[currentBoard]) ? threadMap[currentBoard] : [];
  const now = Date.now();
  const threadId = buildThreadId(boardThreads);

  boardThreads.unshift({
    threadId,
    opPostId: formatPostId(1),
    authorId: clientId,
    authorRole: role,
    subject,
    body: post,
    createdAt: now,
    updatedAt: now,
    replyCount: 0,
    replies: [],
    pinned: false,
    locked: false,
    archived: false,
  });

  threadMap[currentBoard] = boardThreads;
  saveThreads(threadMap);

  threadSubject.value = "";
  threadBody.value = "";
  threadComposer.classList.add("hidden");
  renderBookmarks();
  renderThreads();
}

function toggleBookmark(threadId) {
  const bookmarks = loadBookmarks();
  const boardBookmarks = Array.isArray(bookmarks[currentBoard]) ? bookmarks[currentBoard] : [];
  const numericId = Number(threadId);
  bookmarks[currentBoard] = boardBookmarks.includes(numericId)
    ? boardBookmarks.filter((id) => id !== numericId)
    : [numericId, ...boardBookmarks];
  saveBookmarks(bookmarks);
  renderBookmarks();
  renderThreads();
}

function renderBoard() {
  const board = boardMeta[currentBoard];
  boardTitle.textContent = board.title;
  boardCode.textContent = board.title;
  boardDescription.textContent = board.description;
  document.title = `${board.title} - Ascend Chan`;
  renderBookmarks();
  renderThreads();
  syncViewMode();
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

threadSearch.addEventListener("input", renderThreads);
threadFilter.addEventListener("change", renderThreads);
toggleComposer.addEventListener("click", () => {
  threadComposer.classList.toggle("hidden");
});
postThreadButton.addEventListener("click", createThread);

threadSubject.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    createThread();
  }
});

threadBody.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    createThread();
  }
});

listViewButton.addEventListener("click", () => {
  currentView = "list";
  localStorage.setItem(storageKeys.threadView, currentView);
  syncViewMode();
});

catalogViewButton.addEventListener("click", () => {
  currentView = "catalog";
  localStorage.setItem(storageKeys.threadView, currentView);
  syncViewMode();
});

document.addEventListener("click", (event) => {
  const bookmarkButton = event.target.closest("[data-bookmark-thread]");
  if (bookmarkButton) {
    event.stopPropagation();
    toggleBookmark(bookmarkButton.dataset.bookmarkThread);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-thread]");
  if (deleteButton) {
    event.stopPropagation();
    deleteThread(deleteButton.dataset.deleteThread);
    return;
  }

  const threadCard = event.target.closest("[data-thread-link]");
  if (threadCard) {
    window.location.href = `thread.html?board=${currentBoard}&thread=${threadCard.dataset.threadLink}`;
  }
});

applyPreferences(draftPrefs);
renderBoard();
