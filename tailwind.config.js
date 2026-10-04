/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f5f3ed', surface: '#fffefa', raised: '#edece4', overlay: '#e5e7de',
        border: '#dadcd2', 'border-strong': '#b8c0b3', subtle: '#747c71',
        muted: '#626d60', dim: '#4c584c', text: '#242c28',
        gold: { DEFAULT: '#244b3c', dim: '#183c2d', muted: '#e7ede4', border: '#b9c9b8', glow: '#eff2e9' },
        red: { DEFAULT: '#a34436', dim: '#88352a', muted: '#f8eae4', border: '#e6c3b9' },
        green: { DEFAULT: '#3d6549', muted: '#e9efe4', border: '#c2d0b9' },
      },
      fontFamily: {
        sans: ['Manrope', 'Arial', 'sans-serif'],
        display: ['Oswald', 'Impact', 'Arial Narrow', 'sans-serif'],
      },
      fontSize: { '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }] },
      boxShadow: {
        card: '0 3px 12px rgba(36,44,40,0.035)',
        modal: '0 24px 100px rgba(22,40,29,0.2)',
        focus: '0 0 0 3px rgba(36,75,60,0.18)',
      },
      borderRadius: { DEFAULT: '6px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
      keyframes: {
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-5px)' }, '40%,80%': { transform: 'translateX(5px)' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { shake: 'shake 0.4s ease-in-out', 'fade-in': 'fade-in 0.2s ease-out' },
    },
  },
  plugins: [],
}
