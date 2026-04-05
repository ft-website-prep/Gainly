/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Gainly Color Scheme (CSS-variable-backed for dark mode) ===
        dark: 'var(--color-dark)',
        light: 'var(--color-light)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        dim: 'var(--color-dim)',
        // Accent stays hardcoded so opacity modifiers (accent/20) keep working
        accent: '#e10600',
        'accent-hover': '#ff3b3b',
        'accent-soft': 'var(--color-accent-soft)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
