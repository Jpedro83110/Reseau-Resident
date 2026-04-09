import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { Sentry, sentryEnabled } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import './index.css';
import App from './App';

initAnalytics();

// Arbre React principal — Sentry.ErrorBoundary uniquement si le DSN est configuré
const appTree = (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {sentryEnabled ? (
      <Sentry.ErrorBoundary fallback={({ error }) => <ErrorBoundary forceError={error} />}>
        {appTree}
      </Sentry.ErrorBoundary>
    ) : (
      appTree
    )}
  </StrictMode>
);
