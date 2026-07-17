import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Check if the error is a Vite dynamic import failure (chunk load error)
    const isChunkLoadError = error?.message?.match(/Failed to fetch dynamically imported module/i) ||
                             error?.name === 'ChunkLoadError' ||
                             error?.message?.includes('dynamically imported module');
                             
    if (isChunkLoadError) {
      // The app was updated in the background. Reload the page to get the new assets.
      console.log("Chunk load error detected. Reloading page to fetch new assets...");
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      // If it's not a chunk load error, show a generic fallback UI
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Application Error</h2>
          <p>Something went wrong. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
