import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Intercept and suppress Firestore quota exhaustion & scraper fetch console noise
const isSuppressedNoise = (...args: any[]) => {
  return args.some(arg => {
    if (!arg) return false;
    const str = typeof arg === 'string' ? arg : (arg?.message || arg?.stack || String(arg) || '');
    return (
      str.includes('resource-exhausted') ||
      str.includes('Quota exceeded') ||
      str.includes('maximum backoff delay') ||
      str.includes('Quota limit exceeded') ||
      str.includes('TamilMV') ||
      str.includes('getStreams failed') ||
      str.includes('fetch failed')
    );
  });
};

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (isSuppressedNoise(...args)) {
    return; // Gracefully suppressed as app auto-routes to active streaming engine
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (isSuppressedNoise(...args)) {
    return; // Gracefully suppressed
  }
  originalConsoleWarn(...args);
};

// Catch unhandled promise rejections originating from Firestore quota exhaustion or scrapers
window.addEventListener('unhandledrejection', (event) => {
  if (isSuppressedNoise(event.reason)) {
    event.preventDefault();
  }
});

// Register Service Worker for Android PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
