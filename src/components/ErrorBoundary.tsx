import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: '#f1f5f9',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 500 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              خطایی رخ داد
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, lineHeight: 1.8 }}>
              صفحه مورد نظر بارگذاری نشد. لطفاً دوباره تلاش کنید.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              بارگذاری مجدد
            </button>
            {this.state.error && (
              <details style={{ marginTop: 24, fontSize: 12, color: '#64748b', direction: 'ltr', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer' }}>جزئیات خطا</summary>
                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
