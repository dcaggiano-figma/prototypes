import fplPreset from '@figma/proto-tailwind-config';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [fplPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
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
