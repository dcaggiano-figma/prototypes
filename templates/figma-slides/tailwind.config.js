import fplPreset from '@figma/ppg-tailwind-config';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [fplPreset],
  content: [
    ...fplPreset.content,
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        /** Panel header row height (48px) */
        'panel-header': '48px',
        '2px': '2px',
        '3px': '3px',
        '56px': '56px',
        '60px': '60px',
      },
    },
  },
};
