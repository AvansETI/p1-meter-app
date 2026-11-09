import { setupIonicReact } from '@ionic/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/palettes/dark.class.css';
import './theme/fonts.css';
import './theme/variables.css';
import './theme/layout.css';

import './i18n';
import App from './App';
import { hideSplash } from './splash';

// No forced mode: Ionic uses iOS styling on iOS and Material Design elsewhere.
setupIonicReact();

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Wait one frame so the app has painted underneath before the splash fades out.
requestAnimationFrame(() => void hideSplash());
