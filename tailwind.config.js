/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/screens/**/*.{js,ts,jsx,tsx,mdx}',
    './src/game/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#e8d5b7',
        'dark': '#4a4238',
        'accent': '#8b7355',
        'light': '#f5ebe0',
        'green': '#7a9b76',
        'red': '#b85c5c',
        'blue': '#6b8cae',
        'yellow': '#d4a574',
      },
      fontFamily: {
        'pixel': ['monospace'],
      },
    },
  },
  plugins: [],
}
