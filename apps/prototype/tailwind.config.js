import fplPreset from '@figma/ppg-tailwind-config';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [fplPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],
};
