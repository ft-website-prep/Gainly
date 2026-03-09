/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Gainly Red Color Scheme ===
        dark: "#0a0a0a",
        light: "#f6f6f6",
        surface: "#ffffff",
        border: "#eeeeee",
        muted: "#555555",
        dim: "#999999",
        accent: "#e10600",
        "accent-hover": "#ff3b3b",
        "accent-soft": "#fff1f0",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}