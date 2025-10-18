/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f172a",        // slate-900
        card: "#111827",      // gray-900
        muted: "#6b7280",     // gray-500
        text: "#e5e7eb",      // gray-200
        accent: "#22c55e",    // green-500
        accent2: "#06b6d4",   // cyan-500
        danger: "#ef4444",    // red-500
      },
      boxShadow: {
        glow: "0 10px 24px rgba(34,197,94,.35)",
        glowRed: "0 10px 24px rgba(239,68,68,.35)",
      },
    },
  },
  plugins: [],
}
