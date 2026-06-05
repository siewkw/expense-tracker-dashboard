/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        line: '#E2E8F0',
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA'
        }
      },
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.07)',
        lift: '0 20px 50px rgba(99, 102, 241, 0.16)'
      }
    }
  },
  plugins: []
};
