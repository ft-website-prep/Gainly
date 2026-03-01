/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Gainly Light Theme – Soft Blue / Teal ===
        dark: "#1a1d27",        // Haupttext (dunkles Grau-Blau, NICHT reines Schwarz)
        light: "#f8f9fb",       // Haupthintergrund (Off-White, minimal dunkler als #fff)
        muted: "#6b7280",       // Sekundärtext (mittleres Grau)
        dim: "#9ca3af",         // Tertiärtext (helles Grau)
        accent: "#38bdf8",      // Akzentfarbe (Sky Blue / Teal)
        surface: "#f0f2f5",     // Karten-Hintergrund (minimal dunkler als light)
        border: "#e5e7eb",      // Borders (weiches Grau)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}