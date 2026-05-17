import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#fbfbf7',
        visual: '#7c3aed',
        words: '#0f766e',
      },
    },
  },
  plugins: [],
};

export default config;
