import React from 'react';
import { BRAND } from '@/constants';

export type ErrorDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  details?: string;
  onReload?: () => void;
  onDismiss?: () => void;
  /** Show dismiss when recovery without full reload is possible */
  dismissLabel?: string;
};

/** Modal dialog shown when CafePilots hits a render/runtime failure (avoids blank white screen). */
export function ErrorDialog({
  open,
  title = 'Something went wrong',
  message,
  details,
  onReload,
  onDismiss,
  dismissLabel = 'Dismiss',
}: ErrorDialogProps) {
  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cafepilots-error-title"
      aria-describedby="cafepilots-error-message"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(13, 27, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 20,
          background: '#fff',
          border: '1px solid rgba(13, 27, 42, 0.08)',
          boxShadow: '0 24px 64px rgba(13, 27, 42, 0.28)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 20px 12px',
            background: BRAND.gray,
            borderBottom: '1px solid rgba(13, 27, 42, 0.06)',
          }}
        >
          <p
            style={{
              margin: 0,
              color: BRAND.orange,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            CafePilots
          </p>
          <h2
            id="cafepilots-error-title"
            style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: BRAND.navy }}
          >
            {title}
          </h2>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          <p
            id="cafepilots-error-message"
            style={{ margin: '0 0 12px', lineHeight: 1.5, color: '#475569', fontSize: 14 }}
          >
            {message}
          </p>
          {details && (
            <pre
              style={{
                margin: '0 0 16px',
                padding: 12,
                borderRadius: 12,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 11,
                maxHeight: 140,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {details}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  background: '#fff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {dismissLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onReload || (() => window.location.reload())}
              style={{
                height: 40,
                padding: '0 18px',
                borderRadius: 12,
                border: 'none',
                background: BRAND.orange,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorDialog;
