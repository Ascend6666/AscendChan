const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
  role: "ascendchan-role",
};

const defaultPrefs = { theme: "classic-olive", font: "tahoma", fontWeight: "regular", fontSize: 100 };
const body = document.body;
const noticeboardDisplay = document.getElementById("noticeboardDisplay");
const noticeboardEditor = document.getElementById("noticeboardEditor");
const noticeboardInput = document.getElementById("noticeboardInput");
const saveNoticeboard = document.getElementById("saveNoticeboard");

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
    noticeboardDisplay.textContent = text;
    if (noticeboardInput) noticeboardInput.value = text;
  } catch {
    noticeboardDisplay.textContent = "Welcome to Ascend Chan.";
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
