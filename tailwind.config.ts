import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy:      '#1B2A4A',
        teal:      '#00B4D8',
        orange:    '#FF6B35',
        'navy-50': 'rgba(27,42,74,0.05)',
        'navy-10': 'rgba(27,42,74,0.10)',
        'navy-15': 'rgba(27,42,74,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
