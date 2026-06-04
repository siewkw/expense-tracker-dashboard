/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17202a',
        line: '#d9e2ea',
        brand: {
          50: '#eefdf6',
          100: '#d7f9ea',
          500: '#18a46f',
          600: '#0e875a',
          700: '#0a6b49'
        }
      },
      boxShadow: {
        soft: '0 12px 28px rgba(23, 32, 42, 0.08)'
      }
    }
  },
  plugins: []
};
