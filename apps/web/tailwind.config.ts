import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
