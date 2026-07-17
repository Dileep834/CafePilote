import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ConfigErrorScreen } from './ConfigErrorScreen';

interface Props {
  children?: ReactNode;
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
    /Loading chunk [\d]+ failed/i.test(error.message)
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
      // Avoid infinite reload loops when assets are permanently broken
      const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        console.log('Chunk load error detected. Reloading page to fetch new assets...');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.isChunkLoadError) {
        return (
          <ConfigErrorScreen
            title="Failed to load application assets"
            message="A newer deploy may have replaced cached files, or a network error interrupted loading. Reload once to fetch the latest build."
            details={this.state.error?.message}
          />
        );
      }

      return (
        <ConfigErrorScreen
          title="Application error"
          message="Something went wrong while rendering CafePilots. You can reload the page, or check the details below."
          details={this.state.error?.stack || this.state.error?.message}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
