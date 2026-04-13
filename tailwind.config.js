/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        surface: {
          DEFAULT: '#1e293b',
          elevated: '#334155',
        },
        gain: '#22c55e',
        loss: '#ef4444',
      },
    },
  },
  plugins: [],
};
