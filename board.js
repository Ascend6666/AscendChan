const boardMeta = {
  mind: { title: "/mind/", description: "Philosophy, psychology, mental models, and whatever else keeps you awake." },
  body: { title: "/body/", description: "Training, food, sleep, and fixing your physical form slowly." },
  study: { title: "/study/", description: "Techniques, notes, and trying not to waste your semester." },
  skill: { title: "/skill/", description: "Discuss and share real life skills which can help fellow netizens." },
  grind: { title: "/grind/", description: "Work sessions, discipline, streaks, to track your path." },
  social: { title: "/social/", description: "Friendships, communication, loneliness, and real-world awkwardness." },
  tech: { title: "/tech/", description: "Programming, tools, terminals, and side projects." },
  exam: { title: "/exam/", description: "Test prep, panic control, revision plans, and deadline survival." },
  meta: { title: "/meta/", description: "Requests, feedback, bugs, and moderation." },
  stream: { title: "/stream/", description: "Watch parties, premieres, and scheduled streams together." },
};

const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  threadView: "ascendchan-thread-view",
  spamState: "ascendchan-spam-state",
};

const defaultPrefs = { theme: "classic-olive", font: "georgia", fontWeight: "regular", fontSize: 100 };

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
const streamBoard = document.getElementById("streamBoard");
const streamComposer = document.getElementById("streamComposer");
const toggleStreamComposer = document.getElementById("toggleStreamComposer");
const streamTitle = document.getElementById("streamTitle");
const streamUrl = document.getElementById("streamUrl");
const streamSchedule = document.getElementById("streamSchedule");
const createStreamButton = document.getElementById("createStreamButton");
const streamList = document.getElementById("streamList");

let draftPrefs = loadPreferences();
let currentView = localStorage.getItem(storageKeys.threadView) || "list";
let currentThreads = [];
const currentBoard = getCurrentBoard();
let realtimeChannel = null;
let refreshTimer = null;

function getCurrentBoard() {
  const params = new URLSearchParams(window.location.search);
  const board = params.get("board");
  return boardMeta[board] ? board : "mind";
}

function loadPreferences() {
  return {
    theme: localStorage.getItem(storageKeys.theme) || defaultPrefs.theme,
    font: localStorage.getItem(storageKeys.font) || defaultPrefs.font,
    fontWeight: localStorage.getItem(storageKeys.fontWeight) || defaultPrefs.fontWeight,
    fontSize: Number(localStorage.getItem(storageKeys.fontSize)) || defaultPrefs.fontSize,
  };
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

function enforceSpamCooldown() {
  const now = Date.now();
  const state = loadSpamState();
  if (state.cooldownUntil && now < state.cooldownUntil) {
    return { blocked: true, secondsLeft: Math.ceil((state.cooldownUntil - now) / 1000) };
  }
  const recentPosts = (state.posts || []).filter((time) => now - time < 12000);
  if (recentPosts.length >= 5) {
    saveSpamState({ posts: recentPosts, cooldownUntil: now + 60000 });
    return { blocked: true, secondsLeft: 60 };
  }
  recentPosts.push(now);
  saveSpamState({ posts: recentPosts, cooldownUntil: 0 });
  return { blocked: false };
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

function formatThreadState(thread) {
  const labels = [];
  if (thread.pinned) labels.push("pinned");
  if (thread.locked) labels.push("locked");
  if (thread.archived) labels.push("archived");
  return labels.length ? labels.join(" / ") : `${thread.reply_count || 0} replies`;
}

function renderThreadCards(threads, emptyMessage) {
  if (!threads.length) return `<p class="empty-state">${emptyMessage}</p>`;
  return threads.map((thread) => `
    <article class="thread-card thread-card-link thread-card-compact board-thread-card" data-thread-link="${thread.thread_number}">
      <div class="thread-card-head">
        <span class="thread-no">No.${thread.thread_number}</span>
        <div class="post-actions">
          <button class="reply-inline-button bookmark-inline-button" type="button" data-bookmark-thread="${thread.thread_number}">Bookmark</button>
        </div>
      </div>
      <h3>${thread.subject}</h3>
      <div class="thread-card-foot"><span>${formatThreadState(thread)}</span></div>
    </article>
  `).join("");
}

function renderCatalog(threads) {
  if (!threads.length) {
    catalogGrid.innerHTML = '<p class="empty-state">No threads yet.</p>';
    return;
  }
  catalogGrid.innerHTML = threads.map((thread) => `
    <article class="thread-card catalog-card" data-thread-link="${thread.thread_number}">
      <div class="thread-card-head">
        <span class="thread-no">No.${thread.thread_number}</span>
        <div class="post-actions">
          <button class="reply-inline-button bookmark-inline-button" type="button" data-bookmark-thread="${thread.thread_number}">Bookmark</button>
        </div>
      </div>
      <h3>${thread.subject}</h3>
      <p>${formatThreadState(thread)}</p>
    </article>
  `).join("");
}

async function renderBookmarks() {
  try {
    const bookmarks = await window.AscendApi.listBookmarks(currentBoard);
    bookmarkThreads.innerHTML = renderThreadCards(bookmarks, "No bookmarks on this board.");
  } catch {
    bookmarkThreads.innerHTML = '<p class="empty-state">Could not load bookmarks.</p>';
  }
}

function filterThreads() {
  const query = threadSearch.value.trim().toLowerCase();
  const filter = threadFilter.value;
  let threads = [...currentThreads].filter((thread) => !thread.archived);
  if (query) threads = threads.filter((thread) => thread.subject.toLowerCase().includes(query));
  if (filter === "active") {
    threads.sort((a, b) => Number(b.reply_count || 0) - Number(a.reply_count || 0));
  } else if (filter === "new") {
    threads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (filter === "unanswered") {
    threads = threads.filter((thread) => Number(thread.reply_count || 0) === 0);
  } else {
    threads.sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }
  return threads;
}

function renderThreads() {
  const threads = filterThreads();
  threadList.innerHTML = renderThreadCards(threads, "No threads yet.");
  renderCatalog(threads);
}

function renderStreams(streams) {
  if (!streamList) return;
  if (!streams.length) {
    streamList.innerHTML = '<p class="empty-state">No streams yet.</p>';
    return;
  }
  const isAdmin = window.AscendClient.getRole() === "admin";
  streamList.innerHTML = streams.map((stream) => {
    const when = stream.scheduled_at ? new Date(stream.scheduled_at).toLocaleString() : "Now";
    const status = stream.status === "live" ? "live now" : "scheduled";
    return `
      <article class="thread-card stream-card">
        <div class="thread-card-head">
          <span class="thread-no">${status}</span>
          <div class="post-actions">
            <a class="reply-inline-button" href="stream-room.html?stream=${stream.id}">Join</a>
            ${isAdmin ? `<button class="reply-inline-button danger-button" type="button" data-delete-stream="${stream.id}">Delete</button>` : ""}
          </div>
        </div>
        <h3>${stream.title}</h3>
        <p>${when}</p>
      </article>
    `;
  }).join("");
}

function syncViewMode() {
  const catalogMode = currentView === "catalog";
  catalogPanel.classList.toggle("hidden", !catalogMode);
  threadList.parentElement.classList.toggle("hidden", catalogMode);
  listViewButton.classList.toggle("primary-button", !catalogMode);
  catalogViewButton.classList.toggle("primary-button", catalogMode);
}

async function createThread() {
  const subject = threadSubject.value.trim();
  const post = threadBody.value.trim();
  if (!subject || !post) return;
  if (window.AscendClient.getRole() !== "admin") {
    const spamState = enforceSpamCooldown();
    if (spamState.blocked) {
      alert(`Tham ja haggu ${spamState.secondsLeft}s mai wapas try kar.`);
      return;
    }
  }
  try {
    const threadNumber = await window.AscendApi.createThread(currentBoard, subject, post);
    threadSubject.value = "";
    threadBody.value = "";
    threadComposer.classList.add("hidden");
    await refreshBoard();
    window.location.href = `thread.html?board=${currentBoard}&thread=${threadNumber}`;
  } catch (error) {
    alert(error.message || "Could not create thread.");
  }
}

function extractYouTubeId(url) {
  if (!url) return "";
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : "";
}

async function createStream() {
  if (!streamTitle || !streamUrl || !createStreamButton) return;
  const title = streamTitle.value.trim();
  const url = streamUrl.value.trim();
  const scheduledAt = streamSchedule?.value ? new Date(streamSchedule.value).toISOString() : null;
  const videoId = extractYouTubeId(url);
  if (!title || !videoId) {
    alert("Add a title and a valid YouTube link.");
    return;
  }
  try {
    const id = await window.AscendApi.createStream({
      title,
      youtube_id: videoId,
      scheduled_at: scheduledAt,
    });
    streamTitle.value = "";
    streamUrl.value = "";
    if (streamSchedule) streamSchedule.value = "";
    streamComposer?.classList.add("hidden");
    await refreshBoard();
    window.location.href = `stream-room.html?stream=${id}`;
  } catch (error) {
    alert(error.message || "Could not create stream.");
  }
}

async function refreshBoard() {
  if (currentBoard === "stream") {
    const streams = await window.AscendApi.listStreams();
    renderStreams(streams);
    return;
  }
  currentThreads = await window.AscendApi.listThreads(currentBoard);
  renderThreads();
  await renderBookmarks();
}

function scheduleRefresh(delay = 200) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    refreshBoard().catch(() => {
      threadList.innerHTML = '<p class="empty-state">Could not load threads.</p>';
    });
  }, delay);
}

function setupRealtime() {}
function setupPolling() {}

function renderBoardMeta() {
  const board = boardMeta[currentBoard];
  boardTitle.textContent = board.title;
  boardCode.textContent = board.title;
  boardDescription.textContent = board.description;
  document.title = `${board.title} - Ascend Chan`;
}

function openPanel(panel) {
  panel.classList.remove("hidden");
}

function closePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add("hidden");
}

customizeToggle.addEventListener("click", () => {
  draftPrefs = loadPreferences();
  applyPreferences(draftPrefs);
  openPanel(customizePanel);
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
document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => closePanel(button.dataset.closePanel));
});
threadSearch.addEventListener("input", renderThreads);
threadFilter.addEventListener("change", renderThreads);
toggleComposer.addEventListener("click", () => threadComposer.classList.toggle("hidden"));
postThreadButton.addEventListener("click", createThread);
threadSubject.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    createThread();
  }
});
threadBody.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) {
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
toggleStreamComposer?.addEventListener("click", () => streamComposer?.classList.toggle("hidden"));
createStreamButton?.addEventListener("click", createStream);
document.addEventListener("click", async (event) => {
  const deleteStreamButton = event.target.closest("[data-delete-stream]");
  if (deleteStreamButton) {
    if (window.AscendClient.getRole() !== "admin") return;
    const streamId = Number(deleteStreamButton.dataset.deleteStream);
    try {
      await window.AscendApi.deleteStream(streamId);
      await refreshBoard();
    } catch {
      alert("Could not delete stream.");
    }
    return;
  }
  const bookmarkButton = event.target.closest("[data-bookmark-thread]");
  if (bookmarkButton) {
    event.stopPropagation();
    try {
      const active = await window.AscendApi.toggleBookmark(currentBoard, bookmarkButton.dataset.bookmarkThread);
      bookmarkButton.textContent = active ? "Bookmarked" : "Bookmark";
      await renderBookmarks();
    } catch {
      alert("Could not update bookmark.");
    }
    return;
  }
  const threadCard = event.target.closest("[data-thread-link]");
  if (threadCard) {
    window.location.href = `thread.html?board=${currentBoard}&thread=${threadCard.dataset.threadLink}`;
  }
});

applyPreferences(draftPrefs);
renderBoardMeta();
syncViewMode();
if (currentBoard === "stream") {
  document.querySelectorAll(".board-tools, #threadComposer, #bookmarkPanel, .thread-list-panel").forEach((panel) => {
    panel?.classList.add("hidden");
  });
  streamBoard?.classList.remove("hidden");
}
refreshBoard().catch(() => {
  threadList.innerHTML = '<p class="empty-state">Could not load threads.</p>';
});

window.addEventListener("beforeunload", () => {
  if (realtimeChannel) {
    window.AscendSupabase.removeChannel(realtimeChannel);
  }
});
