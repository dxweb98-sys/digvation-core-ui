import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@digvation-labs/ui/styles.css';
import { ApplicationErrorBoundary } from './app/error-boundary/application-error-boundary';
import { ApplicationProviders } from './app/providers/application-providers';
import { ApplicationRouter } from './app/router/application-router';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Application root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ApplicationErrorBoundary>
      <ApplicationProviders>
        <ApplicationRouter />
      </ApplicationProviders>
    </ApplicationErrorBoundary>
  </StrictMode>,
);
