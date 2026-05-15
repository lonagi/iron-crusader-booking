/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals
        bg:       '#0a0a0a',
        surface:  '#111111',
        raised:   '#161616',
        overlay:  '#1c1c1c',
        border:   '#222222',
        'border-strong': '#2e2e2e',
        subtle:   '#333333',
        muted:    '#666666',
        dim:      '#999999',
        text:     '#ebebeb',
        // Accent — warm gold
        gold: {
          DEFAULT: '#e8c96d',
          dim:     '#c9a84a',
          muted:   'rgba(232,201,109,0.12)',
          border:  'rgba(232,201,109,0.2)',
          glow:    'rgba(232,201,109,0.08)',
        },
        // Danger
        red: {
          DEFAULT: '#f04040',
          dim:     '#c03030',
          muted:   'rgba(240,64,64,0.1)',
          border:  'rgba(240,64,64,0.2)',
        },
        // Success
        green: {
          DEFAULT: '#4caf72',
          muted:   'rgba(76,175,114,0.1)',
          border:  'rgba(76,175,114,0.18)',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%':  { transform: 'translateX(-6px)' },
          '40%, 80%':  { transform: 'translateX(6px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shake:    'shake 0.4s ease-in-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        modal: '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        focus: '0 0 0 2px rgba(232,201,109,0.25)',
      },
      borderRadius: {
        DEFAULT: '6px',
        sm:      '4px',
        md:      '8px',
        lg:      '10px',
        xl:      '14px',
      },
    },
  },
  plugins: [],
}
