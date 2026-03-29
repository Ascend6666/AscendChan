const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  spamState: "ascendchan-spam-state",
  threadScroll: "ascendchan-thread-scroll",
};

const defaultPrefs = { theme: "classic-olive", font: "georgia", fontWeight: "regular", fontSize: 100 };

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
let currentThread = null;
let realtimeChannel = null;
let realtimeThreadId = null;
let refreshTimer = null;
let scrollSaveTimer = null;
let hasRestoredScroll = false;

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

function getCooldownStatus() {
  const now = Date.now();
  const state = loadSpamState();
  if (state.cooldownUntil && now < state.cooldownUntil) {
    return { active: true, secondsLeft: Math.ceil((state.cooldownUntil - now) / 1000) };
  }
  return { active: false, secondsLeft: 0 };
}

function syncCooldownUi() {
  const cooldown = getCooldownStatus();
  cooldownNotice.classList.toggle("hidden", !cooldown.active);
  cooldownNotice.textContent = cooldown.active ? `Tham ja haggu ${cooldown.secondsLeft}s mai wapas try kar.` : "";
  replyBody.disabled = cooldown.active;
  postReplyButton.disabled = cooldown.active;
  return cooldown;
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

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return { board: params.get("board") || "mind", thread: Number(params.get("thread")) };
}

function getThreadScrollKey() {
  const { board, thread } = getParams();
  return `${storageKeys.threadScroll}:${board}:${thread}`;
}

function saveThreadScrollPosition() {
  const posts = Array.from(document.querySelectorAll('[id^="p-"]'));
  if (!posts.length) return;
  const anchorPost = posts.find((post) => post.getBoundingClientRect().top >= 0) || posts[posts.length - 1];
  if (!anchorPost?.id) return;
  const payload = {
    postId: anchorPost.id,
    offset: Math.round(anchorPost.getBoundingClientRect().top),
    scrollY: Math.round(window.scrollY),
  };
  sessionStorage.setItem(getThreadScrollKey(), JSON.stringify(payload));
}

function scheduleScrollSave() {
  window.clearTimeout(scrollSaveTimer);
  scrollSaveTimer = window.setTimeout(() => {
    scrollSaveTimer = null;
    saveThreadScrollPosition();
  }, 120);
}

function restoreThreadScrollPosition() {
  if (hasRestoredScroll || window.location.hash) return;
  const raw = sessionStorage.getItem(getThreadScrollKey());
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    const anchor = saved?.postId ? document.getElementById(saved.postId) : null;
    if (anchor) {
      const top = anchor.getBoundingClientRect().top + window.scrollY - Number(saved.offset || 0);
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      hasRestoredScroll = true;
      return;
    }
    if (Number.isFinite(saved?.scrollY)) {
      window.scrollTo({ top: Math.max(0, saved.scrollY), behavior: "auto" });
      hasRestoredScroll = true;
    }
  } catch {}
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function normalizeTodoState(body, savedState) {
  const state = {};
  if (savedState && typeof savedState === "object") {
    Object.entries(savedState).forEach(([key, value]) => {
      const index = Number(key);
      if (Number.isFinite(index)) state[index] = Boolean(value);
    });
  }
  const lines = body.split("\n");
  lines.forEach((line, index) => {
    const todoMatch = line.match(/^\s*\[(?:\s*x\s*)?\]\s*(.*)$/i);
    if (todoMatch && todoMatch[1] && state[index] === undefined) {
      state[index] = /\[\s*x\s*\]/i.test(line);
    }
  });
  return state;
}

function renderPostBody(text, ownerClientId, todoState) {
  let codeCounter = 0;
  const lines = escapeHtml(text).split("\n");
  let inTodoBlock = false;
  let todoTotal = 0;
  let todoChecked = 0;
  const output = [];
  const clientId = window.AscendClient?.getClientId?.() || "";
  const isOwner = !ownerClientId || ownerClientId === clientId;

  const closeTodoBlock = () => {
    if (!inTodoBlock) return;
    const percent = todoTotal ? Math.round((todoChecked / todoTotal) * 100) : 0;
    const completeClass = todoTotal > 0 && todoChecked === todoTotal ? " is-complete" : "";
    output.push(`
      <div class="todo-progress${completeClass}" data-total="${todoTotal}" data-checked="${todoChecked}">
        <div class="todo-progress-bar" style="width:${percent}%;"></div>
        <span class="todo-progress-label">${todoChecked}/${todoTotal}</span>
      </div>
    `);
    output.push(`</div>`);
    inTodoBlock = false;
    todoTotal = 0;
    todoChecked = 0;
  };

  lines.forEach((line, index) => {
    const todoMatch = line.match(/^\s*\[(?:\s*x\s*)?\]\s*(.*)$/i);
    let baseLine = line;
    if (todoMatch && todoMatch[1]) {
      const override = todoState && Object.prototype.hasOwnProperty.call(todoState, index);
      const checked = override ? Boolean(todoState[index]) : /\[\s*x\s*\]/i.test(line);
      const todoText = todoMatch[1];
      if (!inTodoBlock) {
        inTodoBlock = true;
        output.push(`<div class="todo-block" data-owner="${ownerClientId || ""}">`);
      }
      todoTotal += 1;
      if (checked) todoChecked += 1;
      output.push(`
        <label class="todo-line${checked ? " is-checked" : ""}" data-line-index="${index}">
          <input type="checkbox" ${checked ? "checked" : ""} ${isOwner ? "" : "disabled"} />
          <span>${todoText}</span>
        </label>
      `.trim());
      return;
    }

    closeTodoBlock();

    const withLinks = baseLine.replace(/((https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<]*)?)/g, (match, url) => {
      const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
      return `<a class="quote-link" href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    let formatted = withLinks.replace(/&gt;&gt;(\d{3})/g, '<a class="quote-link" href="#p-$1">&gt;&gt;$1</a>');

    formatted = formatted.replace(/``([^`]+)``/g, (_, code) => {
      const id = `code-${codeCounter++}`;
      const highlighted = highlightCode(code);
      return `
        <button class="code-toggle" type="button" data-code-toggle="${id}">code</button>
        <pre class="code-block hidden" id="${id}"><code>${highlighted}</code></pre>
      `;
    });

    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/_([^_]+)_/g, "<u>$1</u>");
    formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    if (baseLine.startsWith("&gt;") && !baseLine.startsWith("&gt;&gt;")) {
      output.push(`<span class="greentext">${formatted}</span>`);
      return;
    }
    output.push(formatted);
  });

  closeTodoBlock();
  return output.join("<br>");
}

function highlightCode(code) {
  let html = code;
  const entities = [];
  html = html.replace(/(&quot;|&#39;)/g, (m) => {
    entities.push(m);
    return `__ENT${entities.length - 1}__`;
  });
  html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|await|async|try|catch)\b/g, '<span class="code-token-keyword">$1</span>');
  html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="code-token-number">$1</span>');
  html = html.replace(/__ENT(\d+)__/g, (_, i) => entities[Number(i)]);
  html = html.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="code-token-string">$1</span>');
  return html;
}

function encodeBody(raw) {
  return window.btoa(unescape(encodeURIComponent(raw)));
}

function decodeBody(encoded) {
  try {
    return decodeURIComponent(escape(window.atob(encoded)));
  } catch {
    return "";
  }
}

function encodeTodoState(state) {
  try {
    return encodeBody(JSON.stringify(state || {}));
  } catch {
    return "";
  }
}

function decodeTodoState(encoded) {
  if (!encoded) return {};
  try {
    return JSON.parse(decodeBody(encoded)) || {};
  } catch {
    return {};
  }
}

function toggleTodoLine(rawBody, lineIndex, checked) {
  const lines = rawBody.split("\n");
  const line = lines[lineIndex];
  if (!line) return rawBody;
  const match = line.match(/^\s*\[(?:\s*x\s*)?\]\s*(.*)$/i);
  if (!match) return rawBody;
  const text = match[1];
  const prefix = checked ? "[x] " : "[] ";
  lines[lineIndex] = `${prefix}${text}`;
  return lines.join("\n");
}

function collectReferences(threadData) {
  const map = {};
  const posts = [{ postId: threadData.opPostId, body: threadData.body }].concat(threadData.replies || []);
  posts.forEach((post) => {
    const matches = post.body.match(/>>\d{3}/g) || [];
    matches.forEach((match) => {
      const target = match.replace(">>", "");
      if (!map[target]) map[target] = [];
      map[target].push(post.postId);
    });
  });
  return map;
}

function renderBacklinks(references, postId) {
  const refs = references[postId] || [];
  if (!refs.length) return "";
  return `<div class="backlinks">${refs.map((ref) => `<a class="quote-link" href="#p-${ref}">&gt;&gt;${ref}</a>`).join(" ")}</div>`;
}

function renderAuthorLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "developer") return "Developer";
  return "";
}

function renderAliasLabel(alias) {
  if (!alias) return "";
  const clean = String(alias).replace(/^@+/, "").trim();
  const formatted = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
  return `<span class="post-alias" aria-label="alias">${escapeHtml(formatted)}</span>`;
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderMetaLabel(role, alias, createdAt) {
  const timestamp = formatTimestamp(createdAt);
  const timestampMarkup = timestamp ? `<span class="post-timestamp">${escapeHtml(timestamp)}</span>` : "";
  if (role === "admin") {
    return `<span class="post-meta-labels"><span class="thread-no">Admin</span>${timestampMarkup}</span>`;
  }
  const aliasLabel = alias ? renderAliasLabel(alias) : "";
  if (aliasLabel || timestampMarkup) {
    return `<span class="post-meta-labels">${aliasLabel}${timestampMarkup}</span>`;
  }
  return "";
}

function postMenuMarkup(postId, posterClientId) {
  return `
    <div class="post-menu-wrap">
      <button class="reply-inline-button post-menu-toggle" type="button" data-menu-target="${postId}">...</button>
      <div class="post-menu hidden" id="menu-${postId}">
        <button class="reply-inline-button" type="button" data-report-post="${postId}" data-target-client="${posterClientId || ""}">Report</button>
      </div>
    </div>
  `;
}

function adminDeleteMarkup(postId, isOp) {
  if (window.AscendClient?.getRole() !== "admin") return "";
  const label = isOp ? "Delete thread" : "Delete";
  return `<button class="reply-inline-button danger-button" type="button" data-admin-delete="${postId}" data-admin-delete-op="${isOp ? "true" : "false"}">${label}</button>`;
}

function formatAsGreentext(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");
}

function createQuoteButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quote-float";
  button.textContent = "Quote";
  document.body.appendChild(button);
  return button;
}

async function renderThreadPage() {
  const { board, thread } = getParams();
  const threadData = await window.AscendApi.getThread(board, thread);
  currentThread = threadData;
  threadPageBoard.textContent = `/${board}/`;
  backToBoard.href = `board.html?board=${board}`;
  subnavBoardLink.href = `board.html?board=${board}`;

  if (!threadData) {
    threadPagePanel.innerHTML = '<p class="empty-state">Thread not found. Go back and create one first.</p>';
    return;
  }

  const bookmarkedThreads = await window.AscendApi.listBookmarks(board);
  const bookmarked = bookmarkedThreads.some((entry) => Number(entry.thread_number) === Number(threadData.thread_number));
  bookmarkToggle.textContent = bookmarked ? "Bookmarked" : "Bookmark";

  const references = collectReferences(threadData);
  threadPagePanel.innerHTML = `
    <div class="section-title">Thread No.${threadData.thread_number}${threadData.locked ? " / locked" : ""}${threadData.pinned ? " / pinned" : ""}</div>
    <div class="thread-list">
      <article class="thread-card thread-card-op" id="p-${threadData.opPostId}">
        <div class="thread-card-head">
          ${renderMetaLabel(threadData.author_role, threadData.poster_alias, threadData.created_at)}
          <div class="post-actions">
            ${postMenuMarkup(threadData.opPostId, threadData.poster_client_id)}
            <button class="reply-inline-button" type="button" data-reply-target="${threadData.opPostId}">Reply</button>
            ${adminDeleteMarkup(threadData.opPostId, true)}
            <span class="post-id">${threadData.opPostId}</span>
          </div>
        </div>
        <h3>${escapeHtml(threadData.subject)}</h3>
        <p class="post-body" data-thread-id="${threadData.id}" data-post-number="1" data-is-op="true" data-body="${encodeBody(threadData.body)}" data-todo-state="${encodeTodoState(normalizeTodoState(threadData.body, threadData.todo_state))}">
          ${renderPostBody(threadData.body, threadData.poster_client_id, normalizeTodoState(threadData.body, threadData.todo_state))}
        </p>
        ${renderBacklinks(references, threadData.opPostId)}
      </article>
      ${threadData.replies.length ? threadData.replies.map((reply) => `
        <article class="thread-card" id="p-${reply.postId}">
          <div class="thread-card-head">
            ${renderMetaLabel(reply.author_role, reply.poster_alias, reply.created_at)}
            <div class="post-actions">
              ${postMenuMarkup(reply.postId, reply.poster_client_id)}
              <button class="reply-inline-button" type="button" data-reply-target="${reply.postId}">Reply</button>
              ${adminDeleteMarkup(reply.postId, false)}
              <span class="post-id">${reply.postId}</span>
            </div>
          </div>
          <p class="post-body" data-thread-id="${threadData.id}" data-post-number="${reply.post_number}" data-is-op="false" data-body="${encodeBody(reply.body)}" data-todo-state="${encodeTodoState(normalizeTodoState(reply.body, reply.todo_state))}">
            ${renderPostBody(reply.body, reply.poster_client_id, normalizeTodoState(reply.body, reply.todo_state))}
          </p>
          ${renderBacklinks(references, reply.postId)}
        </article>
      `).join("") : '<p class="empty-state">No replies yet.</p>'}
    </div>
  `;

  setupThreadRealtime(threadData);
  restoreThreadScrollPosition();
}

function scheduleRefresh(delay = 200) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    renderThreadPage().catch(() => {
      threadPagePanel.innerHTML = '<p class="empty-state">Could not load thread.</p>';
    });
  }, delay);
}

function setupThreadRealtime() {}
function setupPolling() {}

async function createReply() {
  const text = replyBody.value.trim();
  if (!text || !currentThread) return;
  if (window.AscendClient.getRole() !== "admin") {
    const liveCooldown = syncCooldownUi();
    if (liveCooldown.active) return;
    const spamState = enforceSpamCooldown();
    if (spamState.blocked) {
      syncCooldownUi();
      return;
    }
  }
  try {
    await window.AscendApi.createReply(getParams().board, currentThread.thread_number, text);
    replyBody.value = "";
    await renderThreadPage();
    syncCooldownUi();
  } catch (error) {
    alert(error.message || "Could not post reply.");
  }
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

postReplyButton.addEventListener("click", createReply);
bookmarkToggle.addEventListener("click", async () => {
  if (!currentThread) return;
  try {
    const active = await window.AscendApi.toggleBookmark(getParams().board, currentThread.thread_number);
    bookmarkToggle.textContent = active ? "Bookmarked" : "Bookmark";
  } catch {
    alert("Could not update bookmark.");
  }
});
replyBody.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    createReply();
  }
});

async function handleTodoToggle(todoToggle) {
  if (todoToggle.disabled) return;
  const wrapper = todoToggle.closest(".todo-line");
  wrapper?.classList.toggle("is-checked", todoToggle.checked);
  const block = todoToggle.closest(".todo-block");
  if (block) {
    const postBody = block.closest(".post-body");
    const lineIndex = Number(wrapper?.dataset.lineIndex);
    if (postBody && Number.isFinite(lineIndex)) {
      const encodedState = postBody.dataset.todoState || "";
      const decodedState = decodeTodoState(encodedState);
      const updatedState = { ...decodedState, [lineIndex]: todoToggle.checked };
      const threadId = Number(postBody.dataset.threadId);
      const isOp = postBody.dataset.isOp === "true";
      const postNumber = Number(postBody.dataset.postNumber);
      try {
        if (isOp) {
          const saved = await window.AscendApi.updateThreadTodoState(threadId, updatedState);
          postBody.dataset.todoState = encodeTodoState(saved || updatedState);
        } else {
          const saved = await window.AscendApi.updatePostTodoState(threadId, postNumber, updatedState);
          postBody.dataset.todoState = encodeTodoState(saved || updatedState);
        }
        await renderThreadPage();
      } catch (error) {
        alert(error.message || "Could not update checklist.");
      }
    }
    const inputs = block.querySelectorAll(".todo-line input");
    const checked = block.querySelectorAll(".todo-line input:checked");
    const total = inputs.length;
    const done = checked.length;
    const bar = block.querySelector(".todo-progress-bar");
    const label = block.querySelector(".todo-progress-label");
    const progress = block.querySelector(".todo-progress");
    const percent = total ? Math.round((done / total) * 100) : 0;
    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = `${done}/${total}`;
    if (progress) progress.classList.toggle("is-complete", total > 0 && done === total);
  }
}

document.addEventListener("change", async (event) => {
  const todoToggle = event.target.closest(".todo-line input");
  if (todoToggle) {
    await handleTodoToggle(todoToggle);
    return;
  }
});

document.addEventListener("click", async (event) => {
  const todoToggle = event.target.closest(".todo-line input");
  if (todoToggle) {
    await handleTodoToggle(todoToggle);
    return;
  }
  const codeToggle = event.target.closest("[data-code-toggle]");
  if (codeToggle) {
    const target = document.getElementById(codeToggle.dataset.codeToggle);
    target?.classList.toggle("hidden");
    return;
  }

  const quoteLink = event.target.closest(".quote-link");
  if (quoteLink) {
    const href = quoteLink.getAttribute("href");
    if (href && href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        window.setTimeout(() => {
          target.classList.remove("post-highlight");
          void target.offsetWidth;
          target.classList.add("post-highlight");
          window.setTimeout(() => target.classList.remove("post-highlight"), 1500);
        }, 20);
      }
    }
  }

  const menuToggle = event.target.closest("[data-menu-target]");
  if (menuToggle) {
    const targetMenu = document.getElementById(`menu-${menuToggle.dataset.menuTarget}`);
    document.querySelectorAll(".post-menu").forEach((menu) => {
      if (menu !== targetMenu) menu.classList.add("hidden");
    });
    targetMenu?.classList.toggle("hidden");
    return;
  }

  const reportTarget = event.target.closest("[data-report-post]");
  if (reportTarget && currentThread) {
    try {
      await window.AscendApi.createReport(getParams().board, currentThread.thread_number, reportTarget.dataset.reportPost, reportTarget.dataset.targetClient || null);
      alert("Reported successfully. Now take a chill pill.");
    } catch {
      alert("Could not send report.");
    }
    document.querySelectorAll(".post-menu").forEach((menu) => menu.classList.add("hidden"));
    return;
  }

  if (!event.target.closest(".post-menu-wrap")) {
    document.querySelectorAll(".post-menu").forEach((menu) => menu.classList.add("hidden"));
  }

  const replyTarget = event.target.closest("[data-reply-target]");
  if (!replyTarget) return;
  replyBody.focus();
  const quotePrefix = `>>${replyTarget.dataset.replyTarget}\n`;
  const existingText = replyBody.value.replace(/^\s+/, "");
  replyBody.value = `${quotePrefix}${existingText}`;
  replyBody.setSelectionRange(replyBody.value.length, replyBody.value.length);
});

document.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-admin-delete]");
  if (!deleteButton || !currentThread) return;
  if (window.AscendClient?.getRole() !== "admin") return;

  const postId = deleteButton.dataset.adminDelete;
  const isOp = deleteButton.dataset.adminDeleteOp === "true";
  try {
    if (isOp) {
      await window.AscendApi.deleteThread(getParams().board, currentThread.thread_number);
      window.location.href = `board.html?board=${getParams().board}`;
      return;
    }
    await window.AscendApi.deletePost(getParams().board, currentThread.thread_number, postId);
    await renderThreadPage();
  } catch (error) {
    alert(error.message || "Could not delete post.");
  }
});

applyPreferences(draftPrefs);
syncCooldownUi();
renderThreadPage().catch(() => {
  threadPagePanel.innerHTML = '<p class="empty-state">Could not load thread.</p>';
});
window.setInterval(syncCooldownUi, 1000);
window.addEventListener("scroll", scheduleScrollSave, { passive: true });
window.addEventListener("pagehide", saveThreadScrollPosition);

window.addEventListener("beforeunload", () => {
  saveThreadScrollPosition();
  if (realtimeChannel) {
    window.AscendSupabase.removeChannel(realtimeChannel);
  }
});

const manualRefreshButton = document.getElementById("manualRefreshButton");
if (manualRefreshButton) {
  manualRefreshButton.addEventListener("click", () => scheduleRefresh(0));
}

const quoteButton = createQuoteButton();
let activeSelectionText = "";

function hideQuoteButton() {
  quoteButton.classList.remove("is-visible");
  activeSelectionText = "";
}

function showQuoteButton(rect, text) {
  activeSelectionText = text;
  const padding = 8;
  const left = Math.min(rect.left, rect.right) + rect.width / 2;
  const top = Math.max(8, rect.top - 34);
  quoteButton.style.left = `${Math.max(padding, Math.min(left, window.innerWidth - padding))}px`;
  quoteButton.style.top = `${top}px`;
  quoteButton.style.transform = "translateX(-50%) translateY(0) scale(1)";
  quoteButton.classList.add("is-visible");
}

function isSelectionInsideThread(selection) {
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  return threadPagePanel.contains(container.nodeType === 1 ? container : container.parentNode);
}

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hideQuoteButton();
    return;
  }
  if (!isSelectionInsideThread(selection)) {
    hideQuoteButton();
    return;
  }
  const text = selection.toString().trim();
  if (!text) {
    hideQuoteButton();
    return;
  }
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  showQuoteButton(rect, text);
});

quoteButton.addEventListener("click", () => {
  if (!activeSelectionText) return;
  replyBody.focus();
  const formatted = `${formatAsGreentext(activeSelectionText)}\n`;
  replyBody.value = replyBody.value
    ? `${replyBody.value.replace(/\s+$/, "")}\n${formatted}`
    : formatted;
  replyBody.setSelectionRange(replyBody.value.length, replyBody.value.length);
  hideQuoteButton();
  window.getSelection()?.removeAllRanges();
});

document.addEventListener("scroll", () => {
  if (quoteButton.classList.contains("is-visible")) {
    hideQuoteButton();
  }
}, true);
