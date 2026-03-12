/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
  ],
  theme: {
    extend: {
      colors: {
        fb: {
          blue: '#0E5FD8',
          'blue-hover': '#0A4FB6',
          'blue-dark': '#073E8D',
          green: '#0EA567',
          'green-hover': '#0B8A56',
          red: '#C73B2F',
          bg: '#EEF3FA',
          card: '#FFFFFF',
          text: '#142033',
          'text-secondary': '#31445E',
          'text-tertiary': '#5F7391',
          divider: '#D4DFEE',
          'input-border': '#C4D3E7',
          'input-focus': '#0E5FD8',
          'hover-bg': '#F5F9FF',
          'active-bg': '#E7EFFB',
        },
      },
      fontFamily: {
        fb: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'fb': '0 2px 10px rgba(20, 32, 51, 0.08)',
        'fb-lg': '0 8px 26px rgba(20, 32, 51, 0.12)',
        'fb-xl': '0 20px 60px rgba(20, 32, 51, 0.2)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-rise': 'fade-rise 0.5s ease-out',
      },
    },
  },
  plugins: [],
};
