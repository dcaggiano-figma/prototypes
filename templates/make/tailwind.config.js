import fplPreset from '@figma/proto-tailwind-config';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [fplPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
};
