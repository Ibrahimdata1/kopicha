import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sarabun)', 'Sarabun', 'system-ui', 'sans-serif'],
        display: ['var(--font-kanit)', 'Kanit', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0d9488',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { borderColor: 'rgb(52, 211, 153)' },
          '50%': { borderColor: 'rgb(16, 185, 129)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.15)' },
        },
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 2px 8px rgba(0,0,0,0.06)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.08)',
        'card-xl': '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
