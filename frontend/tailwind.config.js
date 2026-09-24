/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm off-white "paper" background. The muted-indigo accent is Tailwind's
        // default indigo-500 (#6366F1), already used across the UI.
        paper: '#FAF8F4',
      },
    },
  },
  plugins: [],
};
