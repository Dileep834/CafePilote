import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

window.addEventListener('error', (event) => {
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Application Crashed</h1>
      <h2>${event.message}</h2>
      <pre>${event.error?.stack}</pre>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Promise Crashed</h1>
      <h2>${event.reason}</h2>
      <pre>${event.reason?.stack}</pre>
    </div>
  `;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
