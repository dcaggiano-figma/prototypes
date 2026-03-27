import React from 'react';
import ReactDOM from 'react-dom/client';
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';
import { FplSettings } from '@figma/fpl-components';
import { ThemeProvider } from '@figma/fpl-tokens';
import { DevOverlay } from '@figma/ppg-ui';
import App from './App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FplSettings.FlagsProvider value={{}}>
        <DevOverlay />
        <App />
      </FplSettings.FlagsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
