window.AscendConfig = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseAnonKey: "your-public-anon-key",
  adminPasswords: {
    admin: "choose-a-local-admin-password",
    developer: "choose-a-local-developer-password",
  },
  donations: [
    {
      label: "Monero",
      network: "XMR",
      address: "your-monero-address",
      note: "Best choice if you want the most privacy.",
      recommended: true,
    },
    {
      label: "Bitcoin",
      network: "BTC",
      address: "your-bitcoin-address",
      note: "Use a fresh address if privacy matters.",
    },
  ],
};
