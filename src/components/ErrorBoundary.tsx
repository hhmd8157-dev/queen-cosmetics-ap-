import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2, ShieldCheck, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('queen_cosmetics_cart');
      localStorage.removeItem('queen_cosmetics_wishlist');
      localStorage.removeItem('active_order');
      localStorage.removeItem('queen_last_order_code');
      localStorage.removeItem('queen_pending_support_chats');
    } catch {}
    window.location.href = '/';
  };

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#0D0D10] text-[#F4F4F5] flex items-center justify-center p-4 sm:p-6 font-['Cairo',sans-serif]"
        >
          <div className="w-full max-w-lg bg-[#18181C] border border-[#27272A] rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-scale-up">
            {/* Header Icon */}
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>

            {/* Title and Message */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#FFE58F] text-xs font-bold px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>نظام الحماية والأمان • كوزمتك الملكة</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                عذراً، حدث خطأ غير متوقع أثناء العرض
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
                تم حصر الخطأ بواسطة نظام الحماية التلقائي لمنع توقف التطبيق. يمكنك إعادة تشغيل الصفحة أو مسح البيانات المؤقتة.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto bg-[#C5A059] hover:bg-[#D4AF37] text-black font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تشغيل المتجر</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full sm:w-auto bg-[#27272A] hover:bg-[#3F3F46] text-rose-400 border border-rose-500/30 font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح الذاكرة وإعادة الضبط</span>
              </button>
            </div>

            {/* Error Trace for development mode */}
            {this.state.error && (
              <details className="text-right text-[11px] bg-[#121215] p-3 rounded-xl border border-[#27272A] text-gray-400 max-h-40 overflow-y-auto cursor-pointer">
                <summary className="font-bold text-gray-300 pb-1">تفاصيل الخطأ الفني (Technical Details)</summary>
                <p className="text-rose-400 font-mono mt-1 break-words">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-gray-500 font-mono mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
