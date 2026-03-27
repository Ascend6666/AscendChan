(() => {
  const resetVersion = "deploy-reset-v1";
  const resetMarkerKey = "ascendchan-reset-version";

  if (localStorage.getItem(resetMarkerKey) === resetVersion) {
    return;
  }

  [
    "ascendchan-threads",
    "ascendchan-bookmarks",
    "ascendchan-reports",
    "ascendchan-moderation",
    "ascendchan-spam-state",
    "ascendchan-bans",
  ].forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(resetMarkerKey, resetVersion);
})();
