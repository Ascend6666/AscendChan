window.AscendSupabase = window.supabase.createClient(
  "https://jahelvegyobeosmsuhou.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaGVsdmVneW9iZW9zbXN1aG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjAxMjcsImV4cCI6MjA5MDE5NjEyN30.oxQ4Fu8380cztRlI99DPy89Cd3LzM6ZIBGR3GRoLHIo",
);

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
