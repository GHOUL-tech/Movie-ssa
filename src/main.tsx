import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Suppress noisy internal Firebase SDK quota errors since we handle fallback gracefully
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('@firebase/firestore') && 
    (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('maximum backoff delay'))
  ) {
    return; // Suppress
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
