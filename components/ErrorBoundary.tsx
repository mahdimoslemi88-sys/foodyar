import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in their child
 * component tree, log those errors, and display a fallback UI instead of the
 * component tree that crashed.
 * 
 * Using explicit React.Component and a constructor ensures maximum compatibility
 * with various ESM and CDN-based React distributions where named exports like
 * { Component } might be inconsistent.
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for debugging purposes.
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    // Attempt to recover by re-rendering the children.
    this.setState({ hasError: false });
  }

  public render() {
    if (this.state.hasError) {
      // Render a custom fallback UI when an error is caught.
      return (
        <div className="w-full h-screen flex items-center justify-center p-8 bg-slate-100">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl text-center p-12 border-t-8 border-rose-500 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                    <AlertTriangle className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-3">خطایی در برنامه رخ داده است</h1>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    متاسفانه مشکلی در بارگذاری این بخش از سیستم پیش آمده است. تیم فنی ما در حال بررسی موضوع است.
                </p>
                <button
                    onClick={this.handleReset}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    تلاش مجدد برای بارگذاری
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;