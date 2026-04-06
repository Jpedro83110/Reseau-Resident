/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bleu': '#1a3a5c',
        'bleu-clair': '#2a5298',
        'or': '#c8963e',
        'or-clair': '#e8b86d',
        'creme': '#faf7f2',
        'gris': '#6b7280',
        'gris-clair': '#f3f0eb',
        'texte': '#1c1c1c',
        'vert': '#2d7a4f',
        primaire: { DEFAULT: '#2563EB', dark: '#1D4ED8', light: '#DBEAFE' },
        secondaire: { DEFAULT: '#059669', dark: '#047857', light: '#D1FAE5' },
        accent: { DEFAULT: '#EA580C', dark: '#C2410C', light: '#FED7AA' },
      },
      fontFamily: {
        'sans': ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'serif': ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(37, 99, 235, 0.3)',
        'glow-lg': '0 0 40px rgba(37, 99, 235, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
