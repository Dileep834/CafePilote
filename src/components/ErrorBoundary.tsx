import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDialog } from './ErrorDialog';

interface Props {
  children?: ReactNode;
  /** Optional label for which area crashed */
  area?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkLoadError: boolean;
}

const CHUNK_RELOAD_KEY = 'cafepilots_chunk_reload';

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    error.name === 'ChunkLoadError' ||
    error.message.includes('dynamically imported module') ||
    /Loading chunk [\d]+ failed/i.test(error.message) ||
    /does not provide an export named/i.test(error.message)
  );
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkLoadError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkLoadError: isChunkLoadError(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    if (isChunkLoadError(error)) {
      const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  }

  private clearError = () => {
    this.setState({ hasError: false, error: null, isChunkLoadError: false });
  };

  public render() {
    if (this.state.hasError) {
      const area = this.props.area ? ` (${this.props.area})` : '';
      const title = this.state.isChunkLoadError
        ? 'Failed to load application assets'
        : `Application error${area}`;
      const message = this.state.isChunkLoadError
        ? 'A module failed to load (often after a hot reload or deploy). Reload to fetch a clean build.'
        : 'Something went wrong while rendering CafePilots. The blank screen is blocked — reload to continue, or check details below.';

      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#F3F3F8',
            position: 'relative',
          }}
        >
          <ErrorDialog
            open
            title={title}
            message={message}
            details={this.state.error?.stack || this.state.error?.message}
            onReload={() => window.location.reload()}
            onDismiss={this.clearError}
            dismissLabel="Try again"
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
