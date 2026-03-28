const streamTitleHeading = document.getElementById("streamTitleHeading");
const streamStatusBadge = document.getElementById("streamStatusBadge");
const streamScheduleText = document.getElementById("streamScheduleText");
const streamMessages = document.getElementById("streamMessages");
const streamChatInput = document.getElementById("streamChatInput");
const sendStreamMessage = document.getElementById("sendStreamMessage");
const hostControls = document.getElementById("hostControls");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const syncButton = document.getElementById("syncButton");

let streamData = null;
let player = null;
let pollTimer = null;
let lastMessageCount = 0;

function getStreamId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("stream"));
}

function isHost() {
  if (!streamData) return false;
  return streamData.host_client_id === window.AscendClient.getClientId();
}

function formatMessage(msg) {
  const name = msg.client_id ? msg.client_id.slice(-4) : "anon";
  return `<div class="stream-message"><strong>${name}</strong> ${escapeHtml(msg.body)}</div>`;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function initPlayer(videoId) {
  player = new window.YT.Player("ytPlayer", {
    videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
    },
  });
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

async function refreshMessages() {
  if (!streamData) return;
  const list = await window.AscendApi.listStreamMessages(streamData.id);
  if (list.length === lastMessageCount) return;
  streamMessages.innerHTML = list.map(formatMessage).join("");
  streamMessages.scrollTop = streamMessages.scrollHeight;
  lastMessageCount = list.length;
}

async function refreshState() {
  if (!streamData || !player || isHost()) return;
  const state = await window.AscendApi.getStreamState(streamData.id);
  if (!state) return;
  const currentTime = player.getCurrentTime();
  if (Math.abs(currentTime - Number(state.playback_time || 0)) > 2) {
    player.seekTo(Number(state.playback_time || 0), true);
  }
  if (state.is_playing) {
    player.playVideo();
  } else {
    player.pauseVideo();
  }
}

async function sendMessage() {
  const text = streamChatInput.value.trim();
  if (!text || !streamData) return;
  try {
    await window.AscendApi.sendStreamMessage(streamData.id, text);
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
  player.playVideo();
  await broadcastState();
});

pauseButton?.addEventListener("click", async () => {
  if (!player) return;
  player.pauseVideo();
  await broadcastState();
});

syncButton?.addEventListener("click", async () => {
  await broadcastState();
});

loadStream()
  .then(async () => {
    await refreshMessages();
    pollTimer = window.setInterval(async () => {
      await refreshMessages();
      await refreshState();
    }, 3000);
  })
  .catch(() => {
    streamTitleHeading.textContent = "Stream not found";
  });

window.addEventListener("beforeunload", () => {
  if (pollTimer) window.clearInterval(pollTimer);
});
