const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
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
const fontSelect = document.getElementById("fontSelect");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const savePreferences = document.getElementById("savePreferences");
const resetPreferences = document.getElementById("resetPreferences");
const themeButtons = document.querySelectorAll("[data-theme-option]");
const fontWeightButtons = document.querySelectorAll("[data-font-weight]");
const donationGrid = document.getElementById("donationGrid");

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDonationMethods() {
  const methods = Array.isArray(window.AscendConfig?.donations) ? window.AscendConfig.donations : [];
  if (!methods.length) {
    donationGrid.innerHTML = '<p class="empty-state">No donation methods configured yet. Add them in local-config.js.</p>';
    return;
  }

  donationGrid.innerHTML = methods
    .map((method, index) => `
      <article class="dashboard-card donation-card">
        <div class="donation-card-head">
          <div>
            <h3>${escapeHtml(method.label || "Donation method")}</h3>
            <p class="donation-meta">${escapeHtml(method.network || "anonymous-friendly")}</p>
          </div>
          ${method.recommended ? '<span class="donation-badge">recommended</span>' : ""}
        </div>
        <p class="donation-note">${escapeHtml(method.note || "Use the address below exactly as shown.")}</p>
        <label class="select-wrap donation-address-wrap" for="donationAddress${index}">
          <span>Address</span>
          <textarea id="donationAddress${index}" rows="3" readonly>${escapeHtml(method.address || "")}</textarea>
        </label>
        <div class="composer-actions">
          <button class="utility-button" type="button" data-copy-donation="${index}">Copy address</button>
        </div>
      </article>
    `)
    .join("");
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

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-donation]");
  if (!copyButton) return;

  const index = Number(copyButton.dataset.copyDonation);
  const methods = Array.isArray(window.AscendConfig?.donations) ? window.AscendConfig.donations : [];
  const address = methods[index]?.address || "";
  if (!address) return;

  try {
    await navigator.clipboard.writeText(address);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy address";
    }, 1200);
  } catch {
    copyButton.textContent = "Copy failed";
    window.setTimeout(() => {
      copyButton.textContent = "Copy address";
    }, 1200);
  }
});

applyPreferences(draftPrefs);
renderDonationMethods();
