'use client';

import * as React from 'react';
import { Alert, Button } from '@urgent/ui';
import { AlertTriangle } from 'lucide-react';
import { reportError, type ErrorScope } from './report';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Which boundary this is, so reports say where the error was caught. */
  scope?: Exclude<ErrorScope, 'route'>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, this.props.scope ?? 'component', { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full">
            <Alert variant="danger">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h3 className="font-bold mb-2">Something went wrong</h3>
                <p className="text-sm mb-4">
                  We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
                </p>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                >
                  Refresh Page
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
