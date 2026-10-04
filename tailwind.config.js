/** @type {import('tailwindcss').Config} */
const color = name => `rgb(var(--${name}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: color('bg'), surface: color('surface'), raised: color('raised'), overlay: color('overlay'),
        border: color('border'), 'border-strong': color('border-strong'), subtle: color('muted'),
        muted: color('muted'), dim: color('dim'), text: color('text'), 'on-accent': color('on-accent'),
        gold: { DEFAULT: color('accent'), dim: color('accent-hover'), muted: color('accent-muted'), border: color('accent-border'), glow: color('accent-muted') },
        red: { DEFAULT: color('danger'), dim: color('danger'), muted: color('danger-muted'), border: color('danger-border') },
        green: { DEFAULT: color('success'), muted: color('success-muted'), border: color('success-border') },
      },
      fontFamily: {
        sans: ['Manrope', 'Arial', 'sans-serif'],
        display: ['Oswald', 'Roboto Condensed', 'Arial Narrow', 'sans-serif'],
      },
      fontSize: { '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }] },
      boxShadow: {
        card: '0 3px 12px rgba(0,0,0,0.08)',
        modal: '0 24px 100px rgba(0,0,0,0.4)',
        focus: '0 0 0 3px rgb(var(--accent) / 0.2)',
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
