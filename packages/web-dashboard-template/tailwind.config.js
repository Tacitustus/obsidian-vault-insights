/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0d1117",
        surface: "#161b22",
        surfaceHover: "#21262d",
        border: "#30363d",
        textPrimary: "#c9d1d9",
        textSecondary: "#8b949e",
        accent: "#58a6ff",
        success: "#2ea043",
        warning: "#d29922",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
