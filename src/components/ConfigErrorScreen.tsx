import React from 'react';

interface ConfigErrorScreenProps {
  title?: string;
  message: string;
  details?: string;
}

/** Full-page fallback when the app cannot start (missing env, bootstrap failure, etc.). */
export const ConfigErrorScreen: React.FC<ConfigErrorScreenProps> = ({
  title = 'CafePilots configuration error',
  message,
  details,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        background: 'linear-gradient(160deg, #0D1B2A 0%, #1B263B 50%, #0D1B2A 100%)',
        color: '#f8fafc',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          padding: '32px',
          borderRadius: 16,
          background: 'rgba(13, 27, 42, 0.9)',
          border: '1px solid rgba(255, 106, 0, 0.35)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ color: '#FF6A00', fontWeight: 800, fontSize: 14, letterSpacing: 1, marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {/* Keep brand text consistent */}
            CafePilots
          </span>
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>{title}</h1>
        <p style={{ margin: '0 0 16px', lineHeight: 1.5, color: '#cbd5e1' }}>{message}</p>
        {details && (
          <pre
            style={{
              margin: '0 0 20px',
              padding: 12,
              borderRadius: 8,
              background: '#020617',
              color: '#fca5a5',
              fontSize: 12,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {details}
          </pre>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 18px',
            background: '#FF6A00',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
};

export default ConfigErrorScreen;
