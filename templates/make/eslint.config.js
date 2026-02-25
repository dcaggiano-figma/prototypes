import baseConfig from '@figma/proto-eslint-config';

export default [
    ...baseConfig,
    {
      rules: {
        'tailwindcss/no-arbitrary-value': 'off',
      },
    },
  ];