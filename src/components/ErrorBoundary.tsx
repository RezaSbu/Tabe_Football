import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center" dir="rtl">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">خطایی رخ داد</h2>
            <p className="text-sm text-gray-400">
              بخشی از سایت با مشکل مواجه شد. لطفاً صفحه را رفرش کنید.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
            >
              رفرش صفحه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
