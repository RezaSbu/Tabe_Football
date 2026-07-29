import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {HelmetProvider} from 'react-helmet-async';
import {ErrorBoundary} from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor: auto-attach JWT token to all requests
const _origFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("football360_admin_token");
  if (token) {
    init = init || {};
    init.headers = {
      ...(typeof init.headers === "object" && init.headers !== null ? Object.fromEntries(
        init.headers instanceof Headers ? init.headers.entries() : Object.entries(init.headers)
      ) : {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return _origFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
