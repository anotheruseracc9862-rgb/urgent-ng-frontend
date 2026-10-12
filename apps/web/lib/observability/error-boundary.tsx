'use client';

import * as React from 'react';
import { Alert, Button } from '@urgent/ui';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
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
    // Log error to monitoring service
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Report to external service (sanitized)
    this.reportError(error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  reportError(error: Error, errorInfo: React.ErrorInfo) {
    // Filter sensitive data before reporting
    const sanitizedStack = error.stack ? this.sanitizeStack(error.stack) : undefined;
    const sanitizedComponentStack = errorInfo.componentStack ? this.sanitizeStack(errorInfo.componentStack) : undefined;

    // TODO: Send to error monitoring service (e.g., Sentry)
    // Only report in production
    if (process.env.NODE_ENV === 'production') {
      // window.errorMonitor?.captureException({
      //   message: error.message,
      //   stack: sanitizedStack,
      //   componentStack: sanitizedComponentStack,
      // });
    }
  }

  sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    // Remove potential sensitive data from stack traces
    return stack
      .replace(/\b\d{11}\b/g, '[PHONE]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{13,}\b/g, '[ID]');
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
