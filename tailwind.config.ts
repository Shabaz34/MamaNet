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
        // Applied globally to bold/extrabold text only (see globals.css) —
        // headlines, meter numbers, primary buttons — everything else stays
        // on Heebo. Not meant to be used as a utility class directly.
        display: ['var(--font-rubik)', 'var(--font-heebo)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Visual-refresh palette: a deep berry-plum in place of stock
        // violet, everywhere `violet-*` is already used in components — a
        // config-level remap on purpose, so no component markup needed to
        // change. Ramp built around brand #7C2A54 (violet-600).
        violet: {
          50: '#FCEEF3',
          100: '#F8D9E6',
          200: '#F0B3CE',
          300: '#E285AE',
          400: '#CD5A8C',
          500: '#A83B6B',
          600: '#7C2A54',
          700: '#5E1F40',
          800: '#48182F',
          900: '#341122',
        },
        // The warm energy accent — used sparingly for the one signature
        // moment (attendance-meter fill gradient), not a general utility.
        coral: {
          50: '#FFF1EC',
          100: '#FFDCD0',
          400: '#FF8A6B',
          500: '#E85A3E',
          600: '#C94628',
        },
      },
    },
  },
  plugins: [],
};

export default config;
