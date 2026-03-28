if (window.supabase && typeof window.supabase.createClient === "function") {
  window.AscendSupabase = window.supabase.createClient(
    "https://jahelvegyobeosmsuhou.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaGVsdmVneW9iZW9zbXN1aG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjAxMjcsImV4cCI6MjA5MDE5NjEyN30.oxQ4Fu8380cztRlI99DPy89Cd3LzM6ZIBGR3GRoLHIo",
  );
} else {
  console.error("Supabase client library failed to load.");
  window.AscendSupabase = null;
}

window.AscendClient = {
  getClientId() {
    const key = "ascendchan-client-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `CID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem(key, created);
    return created;
  },
  getRole() {
    const role = localStorage.getItem("ascendchan-role");
    return role === "admin" || role === "developer" ? role : "anon";
  },
};

window.AscendAlias = {
  names: [
    "chadjeet",
    "nastik",
    "hizruboi",
    "rudraveer",
    "veerarjun",
    "indra",
    "parshuram",
    "brahmachari",
    "gyani",
    "shunya",
    "agnivikram",
    "yoddha",
    "karna",
    "ekagra",
    "sanyasi",
    "karma",
    "shakti",
    "aryaveer",
    "sthitaprajna",
    "tapasvi",
    "shastradhari",
    "krodansh",
    "bhairav",
    "mrityunjaya",
    "tamoghana",
    "aparajit",
    "devendra",
  ],
  key: "ascendchan-thread-aliases",
  buildThreadKey(board, threadNumber) {
    return `${board}:${threadNumber}`;
  },
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || {};
    } catch {
      return {};
    }
  },
  save(map) {
    localStorage.setItem(this.key, JSON.stringify(map));
  },
  getAlias(board, threadNumber, clientId) {
    const map = this.load();
    const threadKey = this.buildThreadKey(board, threadNumber);
    return map?.[threadKey]?.[clientId] || "";
  },
  setAlias(board, threadNumber, clientId, alias) {
    const map = this.load();
    const threadKey = this.buildThreadKey(board, threadNumber);
    map[threadKey] = map[threadKey] || {};
    map[threadKey][clientId] = alias;
    this.save(map);
    return alias;
  },
  pickRandom() {
    const index = Math.floor(Math.random() * this.names.length);
    return this.names[index];
  },
  getOrCreateAlias(board, threadNumber, clientId) {
    const existing = this.getAlias(board, threadNumber, clientId);
    if (existing) return existing;
    const created = this.pickRandom();
    return this.setAlias(board, threadNumber, clientId, created);
  },
};
