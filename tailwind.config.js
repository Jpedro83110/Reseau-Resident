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
      },
      fontFamily: {
        'sans': ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'serif': ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
