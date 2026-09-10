import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Intercept and suppress Firestore quota exhaustion console noise
const isQuotaExhaustedError = (...args: any[]) => {
  return args.some(arg => {
    if (!arg) return false;
    const str = typeof arg === 'string' ? arg : (arg?.message || arg?.stack || String(arg) || '');
    return (
      str.includes('resource-exhausted') ||
      str.includes('Quota exceeded') ||
      str.includes('maximum backoff delay') ||
      str.includes('Quota limit exceeded')
    );
  });
};

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (isQuotaExhaustedError(...args)) {
    return; // Gracefully suppressed as app auto-routes to local offline engine
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (isQuotaExhaustedError(...args)) {
    return; // Gracefully suppressed
  }
  originalConsoleWarn(...args);
};

// Catch unhandled promise rejections originating from Firestore quota exhaustion
window.addEventListener('unhandledrejection', (event) => {
  if (isQuotaExhaustedError(event.reason)) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
