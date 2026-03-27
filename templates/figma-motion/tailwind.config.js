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
      },
      zIndex: {
        10: '10',
        20: '20',
        30: '30',
        50: '50',
      },
    },
  },
};
