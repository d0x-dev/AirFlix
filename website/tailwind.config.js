/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        surface: '#141517',
        surfaceAlt: '#1E1F22',
        primary: '#38bdf8',
        secondary: '#818cf8',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
