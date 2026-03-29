const ascendConfig = window.AscendConfig || {};
const supabaseUrl = ascendConfig.supabaseUrl || "";
const supabaseAnonKey = ascendConfig.supabaseAnonKey || "";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  console.error("Supabase client library failed to load.");
  window.AscendSupabase = null;
} else if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase config. Check public-config.js.");
  window.AscendSupabase = null;
} else {
  window.AscendSupabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
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
    const role = sessionStorage.getItem("ascendchan-role");
    return role === "admin" || role === "developer" ? role : "anon";
  },
};

window.AscendAuth = {
  async getSession() {
    if (!window.AscendSupabase?.auth) return null;
    const { data, error } = await window.AscendSupabase.auth.getSession();
    if (error) throw error;
    return data.session || null;
  },
  async getUser() {
    if (!window.AscendSupabase?.auth) return null;
    const { data, error } = await window.AscendSupabase.auth.getUser();
    if (error) throw error;
    return data.user || null;
  },
  async getProfile(userId) {
    if (!window.AscendSupabase || !userId) return null;
    const { data, error } = await window.AscendSupabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },
  async refreshRole() {
    const user = await this.getUser();
    if (!user) {
      sessionStorage.removeItem("ascendchan-role");
      return { user: null, profile: null, role: "anon" };
    }

    const profile = await this.getProfile(user.id);
    const role = profile?.role === "admin" || profile?.role === "developer" ? profile.role : "user";
    if (role === "admin" || role === "developer") {
      sessionStorage.setItem("ascendchan-role", role);
    } else {
      sessionStorage.removeItem("ascendchan-role");
    }
    return { user, profile, role };
  },
  async signIn(email, password) {
    if (!window.AscendSupabase?.auth) throw new Error("Supabase auth is not available.");
    const { error } = await window.AscendSupabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return this.refreshRole();
  },
  async signOut() {
    if (window.AscendSupabase?.auth) {
      const { error } = await window.AscendSupabase.auth.signOut();
      if (error) throw error;
    }
    sessionStorage.removeItem("ascendchan-role");
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
