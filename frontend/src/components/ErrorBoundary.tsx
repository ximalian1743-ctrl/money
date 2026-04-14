import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultErrorFallback error={error} onReset={this.reset} />;
  }
}

function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <section className="panel" role="alert" aria-live="assertive">
      <div className="panel__header">
        <h2>页面出错了</h2>
        <p>已经记录，可以尝试刷新或返回上一步。</p>
      </div>
      <pre className="error-message">{error.message}</pre>
      <div className="form-actions">
        <button type="button" className="button" onClick={onReset}>
          重试
        </button>
        <button type="button" className="button button--ghost" onClick={() => location.reload()}>
          刷新页面
        </button>
      </div>
    </section>
  );
}
