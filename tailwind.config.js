/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app.js",
    "./modules/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkbg: '#0f172a',
        darkcard: '#1e293b'
      }
    }
  },
  plugins: [],
}
