import baseConfig from '@figma/proto-eslint-config';

export default [
  ...baseConfig,
  {
    rules: {
      // Canvas renderer requires dynamic inline styles for transforms, positions, and colors
      'react/forbid-dom-props': ['error', {
        forbid: [
          { propName: 'onClick', message: 'Use an FPL interactive component (<Button>, <Link>, etc.) instead of adding onClick to a DOM element.' },
          { propName: 'onDoubleClick', message: 'Use an FPL interactive component instead of adding onDoubleClick to a DOM element.' },
          { propName: 'onKeyDown', message: 'Use an FPL interactive component instead of adding onKeyDown to a DOM element.' },
          { propName: 'onKeyUp', message: 'Use an FPL interactive component instead of adding onKeyUp to a DOM element.' },
          { propName: 'onKeyPress', message: 'Use an FPL interactive component instead of adding onKeyPress to a DOM element.' },
        ],
      }],
      'react/forbid-component-props': 'off',
    },
  },
];
