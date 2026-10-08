/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0b0f19',      // deep dark background
          card: '#1e293b',    // slate-800
          border: '#334155',  // slate-700
          text: '#f8fafc',    // slate-50
          muted: '#94a3b8',   // slate-400
          primary: '#6366f1', // indigo-500
          success: '#10b981', // emerald-500
          warning: '#f59e0b', // amber-500
          danger: '#ef4444',  // red-500
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'ripple': 'ripple 3s ease-in-out infinite',
        'orbit': 'orbit calc(var(--duration)*1s) linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        ripple: {
          '0%, 100%': {
            transform: 'translate(-50%, -50%) scale(1)',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(0.9)',
          },
        },
        orbit: {
          '0%': {
            transform: 'rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)',
          },
        },
      }
    },
  },
  plugins: [],
}
