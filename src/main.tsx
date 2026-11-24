import '@fontsource-variable/inter';
import '@fontsource/cinzel/latin-600.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { setupPwa } from '@/app/pwa';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root mancante in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

setupPwa();
