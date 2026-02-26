import baseConfig from '@figma/ppg-eslint-config';

export default [
    ...baseConfig,
    {
      rules: {
        'tailwindcss/no-arbitrary-value': 'off',
      },
    },
  ];