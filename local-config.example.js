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
      address: "your-monero-wallet-address",
      uri: "monero:your-monero-wallet-address",
      qrImage: "monero-qr.png",
      note: "Use this wallet if you want to donate privately.",
      recommended: true,
    },
  ],
};
