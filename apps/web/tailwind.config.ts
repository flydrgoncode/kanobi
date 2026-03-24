import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design system — CSS var tokens (matches quintant principles)
        "bg-base": "var(--bg-base)",
        "bg-surface": "var(--bg-surface)",
        "bg-hover": "var(--bg-hover)",
        "bg-active": "var(--bg-active)",
        "bg-inverse": "var(--bg-inverse)",
        "text-main": "var(--text-main)",
        "text-muted": "var(--text-muted)",
        "text-light": "var(--text-light)",
        "text-inverse": "var(--text-inverse)",
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        "accent-positive": "var(--accent-positive)",
        "accent-negative": "var(--accent-negative)",
        "accent-neutral": "var(--accent-neutral)",
        // Brand palette
        brand: {
          50: "#f0f4ff",
          100: "#dce7ff",
          200: "#bad0ff",
          300: "#8ab0ff",
          400: "#5585ff",
          500: "#2d5fff",
          600: "#1a3fdd",
          700: "#1530b3",
          800: "#162992",
          900: "#172778",
          950: "#111849",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
