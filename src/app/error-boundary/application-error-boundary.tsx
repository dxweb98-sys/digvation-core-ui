import { DConnectionError } from '@digvation-labs/ui';
import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface ApplicationErrorBoundaryState {
  hasError: boolean;
}

export class ApplicationErrorBoundary extends Component<
  PropsWithChildren,
  ApplicationErrorBoundaryState
> {
  public state: ApplicationErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ApplicationErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="application-error-page">
          <DConnectionError
            title="Control Center could not load"
            message="An unexpected application error interrupted this view."
            onRetry={this.handleRetry}
          />
        </main>
      );
    }

    return this.props.children;
  }
}
