window.AscendConfig = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseAnonKey: "your-public-anon-key",
  adminPasswords: {
    admin: "choose-a-local-admin-password",
    developer: "choose-a-local-developer-password",
  },
  donations: [
    {
      label: "UPI",
      network: "India",
      address: "your-upi-id@bank",
      note: "Donate directly using your UPI app.",
      recommended: true,
    },
    {
      label: "Payment Link",
      network: "Razorpay",
      address: "https://rzp.io/your-payment-link",
      note: "Use this if you prefer a hosted checkout page.",
    },
  ],
};
