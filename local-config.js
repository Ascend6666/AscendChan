window.AscendConfig = {
  supabaseUrl: "https://jahelvegyobeosmsuhou.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaGVsdmVneW9iZW9zbXN1aG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjAxMjcsImV4cCI6MjA5MDE5NjEyN30.oxQ4Fu8380cztRlI99DPy89Cd3LzM6ZIBGR3GRoLHIo",
  adminPasswords: {
    admin: "sarthak@ascend666",
    developer: "ascend-dev",
  },
  donations: [
    {
      label: "UPI",
      network: "India",
      address: "add-your-upi-id-here",
      note: "Donate directly using your UPI app.",
      recommended: true,
    },
    {
      label: "Payment Link",
      network: "Razorpay",
      address: "add-your-payment-link-here",
      note: "Use this if you prefer a hosted checkout page.",
    },
  ],
};
