/** @type {import('tailwindcss').Config} */

/**
 * The Verge visual system, encoded once.
 *
 * Section 4 of CLAUDE.md is the source of truth for these values. Nothing in
 * the app is allowed to reach for a colour, radius or font that is not defined
 * here — if a class string contains a raw hex or an arbitrary value, it is a
 * bug.
 *
 * The five `risk` colours are reserved. They mean a risk band and nothing else.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Page background.
        canvas: '#0A0F0D',
        // Card and input surfaces. Translucent so the canvas shows through.
        surface: {
          DEFAULT: 'rgb(255 255 255 / 0.03)',
          raised: 'rgb(255 255 255 / 0.06)',
        },
        // The single accent. Emerald 400.
        accent: {
          DEFAULT: '#34D399',
          quiet: 'rgb(52 211 153 / 0.10)',
          text: '#6EE7B7',
        },
        // Risk scale. 0-20 / 21-40 / 41-60 / 61-80 / 81-100.
        risk: {
          low: '#34D399', // emerald-400
          moderate: '#A3E635', // lime-400
          elevated: '#FBBF24', // amber-400
          high: '#F97316', // orange-500
          severe: '#EF4444', // red-500
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      transitionTimingFunction: {
        verge: 'cubic-bezier(0, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 300ms cubic-bezier(0, 0, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}
