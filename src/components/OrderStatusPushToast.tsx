import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, MapPin, Sparkles, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { OrderStatus } from '../types';
import { StatusAnimatedIcon } from './StatusAnimatedIcon';

export interface PushStatusNotification {
  id: string;
  orderId: string;
  trackingCode: string;
  previousStatus?: OrderStatus | string;
  newStatus: OrderStatus;
  customerName?: string;
  driverNotes?: string;
  timestamp: number;
}

interface OrderStatusPushToastProps {
  notification: PushStatusNotification | null;
  onClose: () => void;
  onOpenTracker: (trackingCode: string) => void;
}

const STATUS_DETAILS: Record<
  OrderStatus,
  {
    title: string;
    description: string;
    badgeText: string;
    badgeBg: string;
    badgeTextCol: string;
    glowColor: string;
  }
> = {
  received: {
    title: 'تم استلام وتأكيد طلبك',
    description: 'وصل طلبك بنجاح إلى نظام كوزمتك الملكة وجاري مراجعته',
    badgeText: 'تم الاستلام',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeTextCol: 'text-amber-700 dark:text-amber-300',
    glowColor: 'shadow-amber-500/10 border-amber-500/30',
  },
  preparing: {
    title: 'جاري تجهيز وتغليف طلبك الملكي',
    description: 'يتم الآن تغليف وتجهيز المنتجات بعناية فائقة لضمان أعلى جودة',
    badgeText: 'قيد التجهيز 📦',
    badgeBg: 'bg-purple-500/15 border-purple-500/30',
    badgeTextCol: 'text-purple-700 dark:text-purple-300',
    glowColor: 'shadow-purple-500/10 border-purple-500/30',
  },
  out_for_delivery: {
    title: 'طلبك في الطريق مع مندوب التوصيل',
    description: 'تم تسليم الطلب للمندوب وهو في طريقه إلى عنوانكم الآن',
    badgeText: 'في الطريق 🛵💨',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30',
    badgeTextCol: 'text-cyan-700 dark:text-cyan-300',
    glowColor: 'shadow-cyan-500/15 border-cyan-500/40',
  },
  delivered: {
    title: 'تم توصيل الطلب بنجاح! 🎉',
    description: 'نتمنى لك تجربة ملكية رائعة ومميزة مع كوزمتك الملكة',
    badgeText: 'تم التسليم ✨',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeTextCol: 'text-emerald-700 dark:text-emerald-300',
    glowColor: 'shadow-emerald-500/15 border-emerald-500/40',
  },
  cancelled: {
    title: 'تم إلغاء الطلب',
    description: 'تم إلغاء هذا الطلب من قبل إدارة المتجر',
    badgeText: 'ملغي ⚠️',
    badgeBg: 'bg-rose-500/15 border-rose-500/30',
    badgeTextCol: 'text-rose-700 dark:text-rose-300',
    glowColor: 'shadow-rose-500/10 border-rose-500/30',
  },
};

export const OrderStatusPushToast: React.FC<OrderStatusPushToastProps> = ({
  notification,
  onClose,
  onOpenTracker,
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const durationMs = 8000;

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const intervalTime = 50;
    const step = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [notification?.id, isPaused]);

  if (!notification) return null;

  const details = STATUS_DETAILS[notification.newStatus] || STATUS_DETAILS.received;

  return (
    <aside
      aria-label="إشعار تحديث حالة الطلب"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md pointer-events-auto select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#15151A]/95 backdrop-blur-md shadow-2xl border ${details.glowColor} animate-push-slide-down transition-all duration-300`}
      >
        {/* Top subtle golden crown bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border-b border-black/5 dark:border-white/5 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 font-bold">👑 كوزمتك الملكة</span>
            <span>•</span>
            <span>تحديث مباشر</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[#1A1A1A] dark:text-white font-bold">
              #{notification.trackingCode}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white rounded-lg transition-colors"
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-4 flex items-start gap-3.5">
          {/* Animated Status Icon */}
          <div className="shrink-0 mt-0.5">
            <StatusAnimatedIcon status={notification.newStatus} size="md" />
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${details.badgeBg} ${details.badgeTextCol}`}
              >
                {details.badgeText}
              </span>
              {notification.customerName && (
                <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] truncate">
                  الزبون: <strong className="text-[#1A1A1A] dark:text-white">{notification.customerName}</strong>
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F4F4F5] leading-tight mb-1">
              {details.title}
            </h4>

            <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
              {details.description}
            </p>

            {/* Optional Driver Note */}
            {notification.driverNotes && (
              <div className="mt-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-2 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                <span className="shrink-0 font-bold">📝 ملاحظة:</span>
                <span className="leading-tight">{notification.driverNotes}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  onOpenTracker(notification.trackingCode);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] hover:bg-black dark:bg-[#C5A059] dark:hover:bg-[#D4AF37] text-white dark:text-[#0D0D10] text-xs font-bold rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>تتبع موقع الطلب مباشرة</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClose}
                className="px-2.5 py-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors font-medium"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>

        {/* Progress timer bar */}
        <div className="w-full bg-black/5 dark:bg-white/5 h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C5A059] to-amber-500 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
