import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg:     { DEFAULT: "#0b0c10", 2: "#0f1117", 3: "#141720", 4: "#1a1e2e", 5: "#1e2336" },
        accent: { blue: "#63b3ff", purple: "#a78bfa", pink: "#f472b6", green: "#4ade80", amber: "#fbbf24" },
      },
      fontFamily: {
        sans:    ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
        display: ["var(--font-syne)", "sans-serif"],
      },
      animation: {
        "fade-up":    "fadeUp 0.25s ease both",
        "pulse-dot":  "pulseDot 2s ease infinite",
        "typing":     "typingBounce 1.2s ease infinite",
        "spin-slow":  "spin 3s linear infinite",
        "slide-in":   "slideIn 0.3s cubic-bezier(0.22,0.68,0,1.2) both",
      },
      keyframes: {
        fadeUp:        { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseDot:      { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        typingBounce:  { "0%,60%,100%": { opacity: "0.4", transform: "translateY(0)" }, "30%": { opacity: "1", transform: "translateY(-4px)" } },
        slideIn:       { from: { opacity: "0", transform: "translateX(20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
      },
      boxShadow: {
        glass: "0 25px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
