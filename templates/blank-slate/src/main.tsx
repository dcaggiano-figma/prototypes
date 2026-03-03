import React from 'react';
import ReactDOM from 'react-dom/client';
import '@figma/fpl-tokens/index.css';
import '@figma/fpl-components/fpl.css';
import { DevOverlay } from '@figma/ppg-ui';
import App from './App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DevOverlay />
    <App />
  </React.StrictMode>,
);
