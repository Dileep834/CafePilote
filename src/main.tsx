import { StrictMode, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorDialog } from './components/ErrorDialog';

const rootElement = document.getElementById('root');
let reactRoot: Root | null = null;

function getRoot(): Root | null {
  if (!rootElement) return null;
  if (!reactRoot) {
    reactRoot = createRoot(rootElement);
  }
  return reactRoot;
}

/** Global fatal overlay host — survives React tree crashes */
function FatalHost() {
  const [fatal, setFatal] = useState<{ title: string; message: string; details?: string } | null>(
    null
  );

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver')) return;
      // Ignore noisy Vite HMR overlay races when message is empty
      if (!event.message && !event.error) return;
      setFatal({
        title: 'Application crashed',
        message: event.message || 'An unexpected error stopped CafePilots from loading.',
        details: event.error?.stack || String(event.error || ''),
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'An unhandled promise rejection stopped CafePilots from loading.';
      setFatal({
        title: 'Promise error',
        message,
        details: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <>
      <App />
      <ErrorDialog
        open={!!fatal}
        title={fatal?.title}
        message={fatal?.message || ''}
        details={fatal?.details}
        onReload={() => window.location.reload()}
        onDismiss={() => setFatal(null)}
      />
    </>
  );
}

if (!rootElement) {
  document.body.textContent = 'CafePilots failed to start: #root element is missing.';
} else {
  const root = getRoot()!;
  root.render(
    <StrictMode>
      <FatalHost />
    </StrictMode>
  );
  rootElement.dataset.appMounted = '1';
}
