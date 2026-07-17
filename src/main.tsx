import { StrictMode, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ConfigErrorScreen } from './components/ConfigErrorScreen';

const rootElement = document.getElementById('root');
let reactRoot: Root | null = null;
let fatalShown = false;

function getRoot(): Root | null {
  if (!rootElement) return null;
  if (!reactRoot) {
    reactRoot = createRoot(rootElement);
  }
  return reactRoot;
}

function showFatalError(title: string, message: string, details?: string) {
  if (fatalShown) return;
  // Let React ErrorBoundary handle render errors when the app already mounted
  if (rootElement?.dataset.appMounted === '1' && rootElement.childElementCount > 0) {
    return;
  }
  fatalShown = true;

  const root = getRoot();
  if (!root) {
    document.body.textContent = `${title}: ${message}`;
    return;
  }

  try {
    root.render(createElement(ConfigErrorScreen, { title, message, details }));
  } catch {
    rootElement!.innerHTML = `
      <div style="padding:24px;font-family:system-ui,sans-serif;max-width:520px;margin:40px auto;">
        <h1 style="color:#b91c1c;">${title}</h1>
        <p>${message}</p>
        ${details ? `<pre style="background:#fef2f2;padding:12px;overflow:auto;">${details}</pre>` : ''}
        <button onclick="location.reload()">Reload page</button>
      </div>
    `;
  }
}

window.addEventListener('error', (event) => {
  if (event.message?.includes('ResizeObserver')) return;
  showFatalError(
    'Application crashed',
    event.message || 'An unexpected error stopped CafePilots from loading.',
    event.error?.stack
  );
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'An unhandled promise rejection stopped CafePilots from loading.';
  const details = reason instanceof Error ? reason.stack : undefined;
  showFatalError('Promise error', message, details);
});

if (!rootElement) {
  document.body.textContent = 'CafePilots failed to start: #root element is missing.';
} else {
  const root = getRoot()!;
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  rootElement.dataset.appMounted = '1';
}
