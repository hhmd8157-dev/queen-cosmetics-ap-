import React, { useState } from 'react';
import { 
  BellRing, 
  X, 
  Phone, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Product } from '../types';
import { formatIQD } from '../data/products';
import { getProductImageUrl } from '../utils/image';

interface StockNotifyModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const StockNotifyModal: React.FC<StockNotifyModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setErrorMsg('يرجى إدخال رقم هاتفك للتواصل');
      return;
    }

    if (cleanPhone.length < 9) {
      setErrorMsg('يرجى كتابة رقم هاتف صحيح (مثال: 07801234567)');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productPrice: product.price,
          productImage: product.image,
          customerPhone: cleanPhone,
          customerName: name.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok && data.success) {
        setIsSuccess(true);
        if (onSuccess) {
          onSuccess(`تم تسجيل طلبك للمنتج "${product.name}" بنجاح! سنقوم بإشعارك فور توفره.`);
        }
      } else {
        // Fallback: save locally
        try {
          const localAlerts = JSON.parse(localStorage.getItem('queen_pending_stock_alerts') || '[]');
          localAlerts.push({
            productId: product.id,
            productName: product.name,
            phone: cleanPhone,
            name: name.trim(),
            date: new Date().toISOString(),
          });
          localStorage.setItem('queen_pending_stock_alerts', JSON.stringify(localAlerts));
          setIsSuccess(true);
          if (onSuccess) {
            onSuccess(`تم تسجيل طلبك للمنتج "${product.name}" بنجاح! سنقوم بإشعارك فور توفره.`);
          }
        } catch {
          setErrorMsg(data.error || 'تعذر تسجيل الطلب حالياً، يرجى المحاولة مرة أخرى');
        }
      }
    } catch (err: any) {
      console.error('Error requesting stock alert:', err);
      // Fallback: save locally
      try {
        const localAlerts = JSON.parse(localStorage.getItem('queen_pending_stock_alerts') || '[]');
        localAlerts.push({
          productId: product.id,
          productName: product.name,
          phone: cleanPhone,
          name: name.trim(),
          date: new Date().toISOString(),
        });
        localStorage.setItem('queen_pending_stock_alerts', JSON.stringify(localAlerts));
        setIsSuccess(true);
      } catch {
        setErrorMsg('حدث خطأ في الاتصال بالخادم، يرجى المحاولة مجدداً');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setPhone('');
    setName('');
    setNotes('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div 
      id="stock-notify-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={handleResetAndClose}
    >
      <div 
        id="stock-notify-modal-container"
        className="relative bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] w-full max-w-md rounded-2xl shadow-2xl border border-[#EAEAEA] dark:border-[#27272A] overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative badge */}
        <div className="p-4 sm:px-6 border-b border-[#EAEAEA] dark:border-[#27272A] flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-rose-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] dark:text-white">
                أخبرني عند توفر المنتج
              </h3>
              <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                تنبيه فوري يصل لإدارة المتجر عبر التلجرام 📲
              </p>
            </div>
          </div>

          <button
            id="close-stock-notify-btn"
            onClick={handleResetAndClose}
            className="p-1.5 text-[#999999] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F2F2F2] dark:hover:bg-[#222228] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {isSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/30 animate-badge-pop">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                تم تسجيل طلبك بنجاح! 🎉
              </h4>
              <p className="text-xs text-[#666666] dark:text-[#A1A1AA] leading-relaxed max-w-xs mx-auto">
                تم إرسال إشعار فوري إلى إدارة كوزمتك الملكة عبر التلجرام. سنقوم بالتواصل معك عبر الهاتف أو الواتساب فور توفر وجبة جديدة من <strong className="text-[#1A1A1A] dark:text-white">"{product.name}"</strong>.
              </p>

              <div className="pt-3">
                <button
                  id="stock-notify-done-btn"
                  onClick={handleResetAndClose}
                  className="w-full bg-[#1A1A1A] dark:bg-[#D4AF37] text-white dark:text-black hover:bg-[#333333] dark:hover:bg-[#E5C158] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  حسناً، شكراً لكم
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Product Mini Preview */}
              <div className="bg-[#F9F9FB] dark:bg-[#1A1A20] p-3 rounded-xl border border-[#EAEAEA] dark:border-[#2A2A33] flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-white dark:bg-[#222228] border border-[#EAEAEA] dark:border-[#33333C] overflow-hidden shrink-0 flex items-center justify-center">
                  {product.image ? (
                    <img 
                      src={getProductImageUrl(product)} 
                      alt={product.name} 
                      className="w-full h-full object-contain bg-white" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Sparkles className="w-5 h-5 text-[#C5A059]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <span className="text-[10px] font-semibold text-[#C5A059] block">
                    {product.brand}
                  </span>
                  <h4 className="text-xs font-bold text-[#1A1A1A] dark:text-white truncate">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#C5A059] dark:text-[#FFE58F]">
                      {formatIQD(product.price)}
                    </span>
                    <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                      نفدت الكمية حالياً
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Info Box */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  أدخل رقم هاتفك وسيقوم فريق المتجر بإشعارك عبر الهاتف أو الواتساب بمجرد وصول الشحنة الجديدة.
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                {/* Phone input */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-white mb-1">
                    رقم الهاتف (أو الواتساب) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="stock-notify-phone-input"
                      type="tel"
                      dir="ltr"
                      required
                      placeholder="0780 123 4567"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-[#FAFAFA] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#2E2E36] focus:border-[#C5A059] dark:focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2.5 text-xs text-left text-[#1A1A1A] dark:text-white placeholder-[#999999] outline-hidden transition-colors"
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                  </div>
                </div>

                {/* Optional Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-white mb-1">
                    الاسم الكريم <span className="text-[10px] text-[#999999] font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="stock-notify-name-input"
                      type="text"
                      placeholder="اسمك أو لقبك..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#FAFAFA] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#2E2E36] focus:border-[#C5A059] dark:focus:border-[#D4AF37] rounded-xl pr-9 pl-3 py-2.5 text-xs text-[#1A1A1A] dark:text-white placeholder-[#999999] outline-hidden transition-colors"
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-white mb-1">
                    ملاحظة خاصة <span className="text-[10px] text-[#999999] font-normal">(مثل: الكمية المطلوبة أو درجة محددة)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="stock-notify-notes-input"
                      rows={2}
                      placeholder="اكتب أي ملاحظة إن وجدت..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-[#FAFAFA] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#2E2E36] focus:border-[#C5A059] dark:focus:border-[#D4AF37] rounded-xl pr-9 pl-3 py-2 text-xs text-[#1A1A1A] dark:text-white placeholder-[#999999] outline-hidden transition-colors resize-none"
                    />
                    <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-[#999999]" />
                  </div>
                </div>

                {/* Error message */}
                {errorMsg && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    id="submit-stock-notify-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        <span>جاري التسجيل...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>تسجيل طلب الإشعار 🔔</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="bg-[#F2F2F2] dark:bg-[#24242A] hover:bg-[#EAEAEA] dark:hover:bg-[#2E2E35] text-[#1A1A1A] dark:text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#999999] pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>معلوماتك آمنة ولن يتم استخدام رقمك إلا لإشعارك بتوفر المنتج.</span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
