/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      colors: {
        ink: '#121212',
        paper: '#FFFFFF',
        rule: '#D9D9D9',
        fire: '#E4572E',
        ok: '#4C9A5B',
        trap: '#D9A520',
        bad: '#C9473F',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-4px)' }, '75%': { transform: 'translateX(4px)' } },
      },
      animation: {
        pop: 'pop 220ms ease-out',
        shake: 'shake 240ms ease-in-out',
      },
    },
  },
  plugins: [],
};
