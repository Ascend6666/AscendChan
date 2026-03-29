const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
};

const defaultPrefs = { theme: "classic-olive", font: "georgia", fontWeight: "regular", fontSize: 100 };
const body = document.body;
const noticeboardDisplay = document.getElementById("noticeboardDisplay");
const noticeboardEditor = document.getElementById("noticeboardEditor");
const noticeboardInput = document.getElementById("noticeboardInput");
const saveNoticeboard = document.getElementById("saveNoticeboard");

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
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

function renderNoticeboardBody(text) {
  let codeCounter = 0;
  const lines = escapeHtml(text).split("\n");
  let inTodoBlock = false;
  let todoTotal = 0;
  let todoChecked = 0;
  const output = [];

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

  lines.forEach((line) => {
    const todoMatch = line.match(/^\s*\[(?:\s*x\s*)?\]\s*(.*)$/i);
    let baseLine = line;
    if (todoMatch && todoMatch[1]) {
      const checked = /\[\s*x\s*\]/i.test(line);
      const todoText = todoMatch[1];
      if (!inTodoBlock) {
        inTodoBlock = true;
        output.push(`<div class="todo-block">`);
      }
      todoTotal += 1;
      if (checked) todoChecked += 1;
      output.push(`
        <label class="todo-line${checked ? " is-checked" : ""}">
          <input type="checkbox" ${checked ? "checked" : ""} disabled />
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

    let formatted = withLinks.replace(/&gt;&gt;(\d{3})/g, '<a class="quote-link" href="thread.html#p-$1">&gt;&gt;$1</a>');

    formatted = formatted.replace(/``([^`]+)``/g, (_, code) => {
      const id = `notice-code-${codeCounter++}`;
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
}

async function renderNoticeboard() {
  if (!noticeboardDisplay) return;
  noticeboardDisplay.textContent = "Loading notice...";
  try {
    const data = await window.AscendApi.getNoticeboard();
    const text = data?.body || "Welcome to Ascend Chan.";
    noticeboardDisplay.innerHTML = renderNoticeboardBody(text);
    if (noticeboardInput) noticeboardInput.value = text;
  } catch {
    noticeboardDisplay.innerHTML = renderNoticeboardBody("Welcome to Ascend Chan.");
  }
}

function syncNoticeboardEditor() {
  if (!noticeboardEditor) return;
  const role = localStorage.getItem(storageKeys.role);
  noticeboardEditor.classList.toggle("hidden", role !== "admin");
}

saveNoticeboard?.addEventListener("click", () => {
  if (!noticeboardInput) return;
  if (localStorage.getItem(storageKeys.role) !== "admin") return;
  const text = noticeboardInput.value.trim() || "Welcome to Ascend Chan.";
  window.AscendApi.setNoticeboard(text)
    .then(renderNoticeboard)
    .catch(() => {
      alert("Could not save notice.");
    });
});

applyPreferences(loadPreferences());
syncNoticeboardEditor();
renderNoticeboard();

document.addEventListener("click", (event) => {
  const codeToggle = event.target.closest("[data-code-toggle]");
  if (codeToggle) {
    const target = document.getElementById(codeToggle.dataset.codeToggle);
    target?.classList.toggle("hidden");
  }
});
