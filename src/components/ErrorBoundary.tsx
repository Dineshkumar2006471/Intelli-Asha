import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('ERROR_BOUNDARY');

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches unhandled rendering errors and displays
 * a user-friendly recovery UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error('Uncaught UI error', { error: error.message, stack: errorInfo.componentStack });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center bg-surface p-8 text-center"
        >
          <span
            className="material-symbols-outlined text-6xl text-error mb-4"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            error
          </span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Something went wrong</h1>
          <p className="text-on-surface-variant mb-6 max-w-md">
            An unexpected error occurred. Our team has been notified. Please try reloading the page.
          </p>
          <code className="bg-surface-container-low text-error text-sm p-3 rounded mb-6 max-w-lg break-all">
            {this.state.error?.message}
          </code>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
