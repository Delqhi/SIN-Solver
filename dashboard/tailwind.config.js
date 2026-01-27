/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'slate': {
          '950': '#0f172a'
        }
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
