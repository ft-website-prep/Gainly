/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Gainly — uses CSS vars so dark mode swaps them ===
        dark: "var(--color-dark)",
        light: "var(--color-light)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        muted: "var(--color-muted)",
        dim: "var(--color-dim)",
        accent: "#e10600",
        "accent-hover": "#ff3b3b",
        "accent-soft": "var(--color-accent-soft)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}