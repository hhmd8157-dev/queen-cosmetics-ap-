import React from 'react';
import { OrderStatus } from '../types';
import { Clock, Package, Bike, PartyPopper, AlertCircle, Sparkles, Check } from 'lucide-react';

interface StatusAnimatedIconProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
  className?: string;
}

export const StatusAnimatedIcon: React.FC<StatusAnimatedIconProps> = ({
  status,
  size = 'md',
  showBackground = true,
  className = '',
}) => {
  // Dimensions based on size prop
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      badge: 'w-3 h-3',
      particle: 'w-1 h-1',
    },
    md: {
      container: 'w-12 h-12',
      icon: 'w-6 h-6',
      badge: 'w-4 h-4',
      particle: 'w-1.5 h-1.5',
    },
    lg: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      badge: 'w-5 h-5',
      particle: 'w-2 h-2',
    },
    xl: {
      container: 'w-24 h-24',
      icon: 'w-12 h-12',
      badge: 'w-7 h-7',
      particle: 'w-2.5 h-2.5',
    },
  }[size];

  switch (status) {
    // 1. RECEIVED (تم استلام الطلب)
    case 'received':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 ${sizeConfig.container} ${className}`}
        >
          {showBackground && (
            <>
              {/* Pulsing radar ripples */}
              <span className="absolute inset-0 rounded-2xl bg-amber-500/20 dark:bg-amber-400/20 animate-ping opacity-60 pointer-events-none" />
              <span className="absolute inset-1 rounded-xl bg-gradient-to-tr from-amber-500/30 to-amber-200/40 dark:from-amber-600/30 dark:to-amber-400/20 border border-amber-500/40" />
            </>
          )}

          {/* Clock with ticking animated hand */}
          <div className="relative z-10 text-amber-600 dark:text-amber-300 flex items-center justify-center">
            <svg
              className={`${sizeConfig.icon} animate-[spin_12s_linear_infinite]`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          {/* Orbiting sparkle */}
          <Sparkles
            className={`absolute -top-1 -right-1 text-amber-500 dark:text-amber-300 ${sizeConfig.badge} animate-pulse`}
          />
        </div>
      );

    // 2. PREPARING (جاري تجهيز وتغليف الطلب)
    case 'preparing':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 ${sizeConfig.container} ${className}`}
        >
          {showBackground && (
            <>
              <span className="absolute inset-0 rounded-2xl bg-purple-500/20 dark:bg-purple-400/20 animate-pulse pointer-events-none" />
              <span className="absolute inset-1 rounded-xl bg-gradient-to-tr from-purple-500/30 to-indigo-400/30 border border-purple-500/40" />
            </>
          )}

          {/* Bouncing Gift / Package Box */}
          <div className="relative z-10 text-purple-600 dark:text-purple-300 flex items-center justify-center animate-[bounce_1.5s_infinite]">
            <Package className={`${sizeConfig.icon}`} />
          </div>

          {/* Floating magic sparkles */}
          <span className="absolute -top-1 left-0 text-amber-400 animate-ping">✨</span>
          <span className="absolute -bottom-1 -right-1 text-purple-400 animate-pulse text-[10px]">🎀</span>
        </div>
      );

    // 3. OUT FOR DELIVERY (مع مندوب التوصيل / في الطريق)
    case 'out_for_delivery':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 ${sizeConfig.container} overflow-hidden ${className}`}
        >
          {showBackground && (
            <>
              <span className="absolute inset-0 rounded-2xl bg-cyan-500/20 dark:bg-cyan-400/20 animate-pulse pointer-events-none" />
              <span className="absolute inset-1 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-blue-500/30 border border-cyan-500/40" />
            </>
          )}

          {/* Road dash effect in background */}
          <div className="absolute bottom-1.5 left-2 right-2 flex justify-between gap-1 opacity-70">
            <span className="w-1.5 h-0.5 bg-cyan-400 rounded-full animate-[pulse_0.6s_infinite]"></span>
            <span className="w-2 h-0.5 bg-cyan-400 rounded-full animate-[pulse_0.8s_infinite]"></span>
            <span className="w-1.5 h-0.5 bg-cyan-400 rounded-full animate-[pulse_0.5s_infinite]"></span>
          </div>

          {/* Moving Scooter with speed vibe */}
          <div className="relative z-10 text-cyan-600 dark:text-cyan-300 flex items-center justify-center animate-[wiggle_1s_ease-in-out_infinite]">
            <Bike className={`${sizeConfig.icon}`} />
          </div>

          {/* Wind streak speed lines */}
          <div className="absolute top-2 right-1 text-[9px] text-cyan-400 dark:text-cyan-300 font-bold opacity-80 animate-pulse">
            💨
          </div>
        </div>
      );

    // 4. DELIVERED (تم التوصيل بنجاح)
    case 'delivered':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 ${sizeConfig.container} ${className}`}
        >
          {showBackground && (
            <>
              <span className="absolute inset-0 rounded-2xl bg-emerald-500/25 dark:bg-emerald-400/25 animate-ping opacity-70 pointer-events-none" />
              <span className="absolute inset-1 rounded-xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/30 border border-emerald-500/50" />
            </>
          )}

          {/* Victorious Party Popper / Checkmark */}
          <div className="relative z-10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center animate-badge-pop">
            <PartyPopper className={`${sizeConfig.icon}`} />
          </div>

          {/* Mini Check badge */}
          <div className="absolute -bottom-1 -left-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md flex items-center justify-center">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>

          {/* Confetti emoji */}
          <span className="absolute -top-1 -right-1 text-[11px] animate-bounce">🎉</span>
        </div>
      );

    // 5. CANCELLED (تم الإلغاء)
    case 'cancelled':
      return (
        <div
          className={`relative flex items-center justify-center shrink-0 ${sizeConfig.container} ${className}`}
        >
          {showBackground && (
            <span className="absolute inset-1 rounded-xl bg-rose-500/20 border border-rose-500/40" />
          )}
          <div className="relative z-10 text-rose-600 dark:text-rose-400 flex items-center justify-center animate-pulse">
            <AlertCircle className={`${sizeConfig.icon}`} />
          </div>
        </div>
      );

    default:
      return null;
  }
};
