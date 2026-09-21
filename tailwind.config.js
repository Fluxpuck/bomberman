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
        // Bomb Blast Arena UI kit (see src/components/ui.tsx)
        ui: {
          ink: '#0a1120',
          'panel-top': '#16233f',
          'panel-bottom': '#0c1526',
          line: 'rgba(124, 196, 255, 0.24)',
          text: '#e8f0fb',
          muted: '#8fa6c9',
          yellow: '#ffce3d',
          'orange-deep': '#a8410c',
          cyan: '#5fd7f2',
          danger: '#ff6b6b',
        },
      },
      fontFamily: {
        // Fonts are loaded with next/font in src/app/layout.tsx.
        sans: ['var(--font-space)', 'Space Grotesk', 'Helvetica', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
        display: ['var(--font-bungee)', 'Bungee', 'sans-serif'],
        pixel: ['Courier New', 'Courier', 'monospace'],
      },
      // Sprite animations (src/components/sprites.tsx)
      keyframes: {
        bombTick: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
        bombSpark: {
          '0%, 100%': { opacity: '.5', transform: 'scale(.75) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.3) rotate(25deg)' },
        },
        bombShock: {
          '0%': { opacity: '.7', transform: 'scale(.6)' },
          '100%': { opacity: '0', transform: 'scale(1.5)' },
        },
        blastFlicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.78' },
        },
        puHover: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        puPulse: {
          '0%, 100%': { opacity: '.35', transform: 'scale(.92)' },
          '50%': { opacity: '.75', transform: 'scale(1.06)' },
        },
        puSpark: {
          '0%, 100%': { opacity: '.5', transform: 'scale(.8)' },
          '50%': { opacity: '1', transform: 'scale(1.25)' },
        },
        bomberBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        bomberStep: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-3px) rotate(2deg)' },
        },
        bomberGlow: {
          '0%, 100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'bomb-tick': 'bombTick .7s ease-in-out infinite',
        'bomb-spark': 'bombSpark .5s ease-in-out infinite',
        'bomb-shock': 'bombShock 1.1s ease-out infinite',
        'blast-flicker': 'blastFlicker .28s ease-in-out infinite',
        'pu-hover': 'puHover 2.2s ease-in-out infinite',
        'pu-pulse': 'puPulse 2s ease-in-out infinite',
        'pu-spark': 'puSpark 1s ease-in-out infinite',
        'bomber-bob': 'bomberBob 2.4s ease-in-out infinite',
        'bomber-step': 'bomberStep .42s ease-in-out infinite',
        'bomber-glow': 'bomberGlow 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
