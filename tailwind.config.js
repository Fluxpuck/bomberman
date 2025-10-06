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
        'lofi-bg': '#e8d5b7',
        'lofi-dark': '#4a4238',
        'lofi-accent': '#8b7355',
        'lofi-light': '#f5ebe0',
        'lofi-green': '#7a9b76',
        'lofi-red': '#b85c5c',
        'lofi-blue': '#6b8cae',
        'lofi-yellow': '#d4a574',
      },
      fontFamily: {
        'pixel': ['monospace'],
      },
    },
  },
  plugins: [],
}
