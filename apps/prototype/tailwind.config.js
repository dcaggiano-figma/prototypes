import fplPreset from '@figma/ppg-tailwind-config';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [fplPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@figma/ppg-ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        /** Panel header row height (48px) */
        'panel-header': '48px',
      },
    },
  },
};
