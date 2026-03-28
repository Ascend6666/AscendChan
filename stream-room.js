const streamTitleHeading = document.getElementById("streamTitleHeading");
const streamStatusBadge = document.getElementById("streamStatusBadge");
const streamScheduleText = document.getElementById("streamScheduleText");
const streamMessages = document.getElementById("streamMessages");
const streamChatInput = document.getElementById("streamChatInput");
const sendStreamMessage = document.getElementById("sendStreamMessage");
const streamDisplayName = document.getElementById("streamDisplayName");
const hostControls = document.getElementById("hostControls");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const syncButton = document.getElementById("syncButton");
const layoutNormalButton = document.getElementById("layoutNormalButton");
const layoutTheaterButton = document.getElementById("layoutTheaterButton");

const storageKeys = {
  theme: "ascendchan-theme",
  font: "ascendchan-font",
  fontWeight: "ascendchan-font-weight",
  fontSize: "ascendchan-font-size",
};

const defaultPrefs = { theme: "classic-olive", font: "tahoma", fontWeight: "regular", fontSize: 100 };
const body = document.body;

let streamData = null;
let player = null;
let pollTimer = null;
let hostHeartbeat = null;
let lastMessageCount = 0;
let lockedDisplayName = "";
let scheduleTimer = null;
let layoutMode = "normal";
let messageChannel = null;

function getStreamId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("stream"));
}

function isHost() {
  if (!streamData) return false;
  return streamData.host_client_id === window.AscendClient.getClientId();
}

function formatMessage(msg) {
  const name = msg.display_name || "anon";
  return `<div class="stream-message"><strong>${escapeHtml(name)}</strong>: ${escapeHtml(msg.body)}</div>`;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function initPlayer(videoId) {
  player = new window.YT.Player("ytPlayer", {
    videoId,
    playerVars: {
      autoplay: 0,
      controls: isHost() ? 1 : 0,
      rel: 0,
      modestbranding: 1,
    },
    events: {
      onStateChange: async (event) => {
        if (!isHost()) return;
        if (isScheduledLocked()) {
          player.pauseVideo();
          player.seekTo(0, true);
          return;
        }
        if (event.data === window.YT.PlayerState.PLAYING || event.data === window.YT.PlayerState.PAUSED) {
          await broadcastState();
        }
      },
    },
  });
}

function applyLayout(mode) {
  layoutMode = mode === "theater" ? "theater" : "normal";
  document.querySelector(".stream-room")?.setAttribute("data-layout", layoutMode);
  layoutNormalButton?.classList.toggle("primary-button", layoutMode === "normal");
  layoutTheaterButton?.classList.toggle("primary-button", layoutMode === "theater");
  if (streamData) {
    localStorage.setItem(`ascendchan-stream-layout:${streamData.id}`, layoutMode);
  }
}


async function loadStream() {
  const id = getStreamId();
  if (!id) {
    streamTitleHeading.textContent = "Stream not found";
    return;
  }
  streamData = await window.AscendApi.getStream(id);
  if (!streamData) {
    streamTitleHeading.textContent = "Stream not found";
    return;
  }
  streamTitleHeading.textContent = streamData.title;
  streamStatusBadge.textContent = streamData.status;
  streamScheduleText.textContent = streamData.scheduled_at
    ? `starts ${new Date(streamData.scheduled_at).toLocaleString()}`
    : "live";

  if (isHost()) {
    hostControls.classList.remove("hidden");
  }

  if (window.YT && window.YT.Player) {
    initPlayer(streamData.youtube_id);
  } else {
    window.onYouTubeIframeAPIReady = () => initPlayer(streamData.youtube_id);
  }
}

function isScheduledLocked() {
  if (!streamData?.scheduled_at) return false;
  if (streamData.status === "live") return false;
  return Date.now() < new Date(streamData.scheduled_at).getTime();
}

function updateScheduleUi() {
  if (!streamData?.scheduled_at) return;
  const startMs = new Date(streamData.scheduled_at).getTime();
  const diff = startMs - Date.now();
  if (diff <= 0) {
    streamStatusBadge.textContent = "live";
    streamScheduleText.textContent = "live";
    streamData.status = "live";
    if (isHost()) {
      window.AscendApi.updateStreamStatus(streamData.id, "live").catch(() => {});
    }
    if (scheduleTimer) {
      window.clearInterval(scheduleTimer);
      scheduleTimer = null;
    }
    return;
  }
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  streamStatusBadge.textContent = "scheduled";
  streamScheduleText.textContent = `starts in ${minutes}m ${seconds}s`;
}

async function refreshMessages() {
  if (!streamData) return;
  const list = await window.AscendApi.listStreamMessages(streamData.id);
  if (list.length === lastMessageCount) return;
  streamMessages.innerHTML = list.map(formatMessage).join("");
  streamMessages.scrollTop = streamMessages.scrollHeight;
  lastMessageCount = list.length;
}

function setupMessageRealtime() {
  if (!window.AscendSupabase?.channel || !streamData?.id) return;
  if (messageChannel) {
    window.AscendSupabase.removeChannel(messageChannel);
  }
  messageChannel = window.AscendSupabase
    .channel(`stream-messages-${streamData.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "stream_messages", filter: `stream_id=eq.${streamData.id}` },
      () => {
        refreshMessages().catch(() => {});
      },
    )
    .subscribe();
}

async function refreshState() {
  if (!streamData || !player || isHost()) return;
  const state = await window.AscendApi.getStreamState(streamData.id);
  if (!state) return;
  const currentTime = player.getCurrentTime();
  if (Math.abs(currentTime - Number(state.playback_time || 0)) > 2) {
    player.seekTo(Number(state.playback_time || 0), true);
  }
  const playerState = player.getPlayerState();
  if (state.is_playing && playerState !== window.YT.PlayerState.PLAYING) {
    player.playVideo();
  }
  if (!state.is_playing && playerState === window.YT.PlayerState.PLAYING) {
    player.pauseVideo();
  }
}

async function sendMessage() {
  const text = streamChatInput.value.trim();
  if (!text || !streamData) return;
  try {
    const name = lockedDisplayName || streamDisplayName?.value.trim();
    if (!name) {
      alert("Set your username first.");
      return;
    }
    if (!lockedDisplayName) {
      lockedDisplayName = name;
      if (streamDisplayName) {
        streamDisplayName.value = name;
        streamDisplayName.disabled = true;
      }
      localStorage.setItem(`ascendchan-stream-name:${streamData.id}`, name);
    }
    await window.AscendApi.sendStreamMessage(streamData.id, text, lockedDisplayName);
    streamChatInput.value = "";
    await refreshMessages();
  } catch (error) {
    alert(error.message || "Could not send message.");
  }
}

async function broadcastState() {
  if (!streamData || !player) return;
  const currentTime = player.getCurrentTime();
  const isPlaying = player.getPlayerState() === window.YT.PlayerState.PLAYING;
  await window.AscendApi.upsertStreamState(streamData.id, currentTime, isPlaying);
}

sendStreamMessage?.addEventListener("click", sendMessage);
streamChatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

playButton?.addEventListener("click", async () => {
  if (!player) return;
  if (isScheduledLocked()) {
    alert("Stream is scheduled. Please wait until it goes live.");
    return;
  }
  player.playVideo();
  await broadcastState();
});

pauseButton?.addEventListener("click", async () => {
  if (!player) return;
  if (isScheduledLocked()) return;
  player.pauseVideo();
  await broadcastState();
});

syncButton?.addEventListener("click", async () => {
  await broadcastState();
});

loadStream()
  .then(async () => {
    applyPreferences(loadPreferences());
    const savedLayout = localStorage.getItem(`ascendchan-stream-layout:${getStreamId()}`) || "normal";
    applyLayout(savedLayout);
    if (streamDisplayName) {
      const saved = localStorage.getItem(`ascendchan-stream-name:${getStreamId()}`) || "";
      streamDisplayName.value = saved;
      if (saved) {
        lockedDisplayName = saved;
        streamDisplayName.disabled = true;
      }
    }
    await refreshMessages();
    setupMessageRealtime();
    updateScheduleUi();
    if (streamData?.scheduled_at) {
      scheduleTimer = window.setInterval(updateScheduleUi, 1000);
    }
    pollTimer = window.setInterval(async () => {
      await refreshState();
    }, 3000);
    if (isHost()) {
      hostHeartbeat = window.setInterval(async () => {
        await broadcastState();
      }, 4000);
    }
  })
  .catch(() => {
    streamTitleHeading.textContent = "Stream not found";
  });

window.addEventListener("beforeunload", () => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (hostHeartbeat) window.clearInterval(hostHeartbeat);
  if (scheduleTimer) window.clearInterval(scheduleTimer);
  if (messageChannel) window.AscendSupabase.removeChannel(messageChannel);
});

layoutNormalButton?.addEventListener("click", () => applyLayout("normal"));
layoutTheaterButton?.addEventListener("click", () => applyLayout("theater"));
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
