import React, { useState, useEffect, useMemo } from 'react';
import { sendTelegramDirectClientSide } from '../utils/telegramClient';
import { deleteOrderEverywhere } from '../services/ordersFirestoreService';
import { subscribeToChatRealtime, sendChatMessageToFirestore } from '../services/chatsFirestoreService';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  Package,
  Bike,
  PartyPopper,
  MapPin,
  ExternalLink,
  Phone,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';
import { Order, OrderStatus } from '../types';
import { formatIQD, STORE_INFO } from '../data/products';
import { getProductImageUrl } from '../utils/image';
import { generateOrderConfirmationWhatsAppUrl } from '../utils/whatsapp';
import { StatusAnimatedIcon } from './StatusAnimatedIcon';
import confetti from 'canvas-confetti';
import { getOrdersBroadcastChannel } from '../utils/alerts';
import { findOrderByCode } from '../services/ordersFirestoreService';

interface LiveOrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackingCode?: string;
  onOpenAdmin?: () => void;
  onClearActiveOrder?: () => void;
}

const STAGES: Array<{
  id: OrderStatus;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  stepNumber: number;
  estTime: string;
}> = [
  {
    id: 'received',
    title: 'تم استلام الطلب',
    subtitle: 'وصل طلبك إلى نظام المتجر وسيتم مراجعته فوراً',
    icon: Clock,
    stepNumber: 1,
    estTime: '5-10 دقيقة',
  },
  {
    id: 'preparing',
    title: 'جاري تجهيز الطلب',
    subtitle: 'يتم تغليف وتجهيز المنتجات الملكية بعناية فائقة',
    icon: Package,
    stepNumber: 2,
    estTime: '20-40 دقيقة',
  },
  {
    id: 'out_for_delivery',
    title: 'مع مندوب التوصيل',
    subtitle: 'الطلب في طريقه إليك الآن مع مندوب التوصيل',
    icon: Bike,
    stepNumber: 3,
    estTime: '30-60 دقيقة',
  },
  {
    id: 'delivered',
    title: 'تم التوصيل بنجاح',
    subtitle: 'نتمنى لك تجربة ممتعة ومميزة مع كوزمتك الملكة',
    icon: PartyPopper,
    stepNumber: 4,
    estTime: 'مكتمل 🎉',
  },
];

// Custom Tooltip for Stages Bar / Area Chart
const CustomStageTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1A1A1A] text-white p-2.5 rounded-xl shadow-xl border border-[#333333] text-xs space-y-1 font-['Cairo',sans-serif]">
        <div className="flex items-center gap-1.5 font-bold text-[#FFE58F]">
          <span>{data.icon}</span>
          <span>{data.name}</span>
        </div>
        <p className="text-[11px] text-[#D4D4D8]">الحالة: <span className="font-semibold text-white">{data.status}</span></p>
        <p className="text-[11px] text-[#A1A1AA]">المدة التقديرية: <span className="font-mono text-[#FFE58F]">{data.estTime}</span></p>
        <div className="w-full bg-[#333333] h-1 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[#C5A059]"
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Items / Financials Pie Chart
const CustomFinanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#1A1A1A] text-white p-2.5 rounded-xl shadow-xl border border-[#333333] text-xs space-y-1 font-['Cairo',sans-serif]">
        <div className="flex items-center gap-1.5 font-bold text-[#FFE58F]">
          <span>{data.name}</span>
        </div>
        <p className="text-[11px] text-[#D4D4D8]">
          القيمة: <span className="font-bold text-white">{formatIQD(data.value)}</span>
        </p>
        {data.payload.percent && (
          <p className="text-[10px] text-[#A1A1AA]">
            النسبة من الإجمالي: {(data.payload.percent * 100).toFixed(1)}%
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const LiveOrderTrackerModal: React.FC<LiveOrderTrackerModalProps> = ({
  isOpen,
  onClose,
  initialTrackingCode = '',
  onOpenAdmin,
  onClearActiveOrder,
}) => {
  const [searchCode, setSearchCode] = useState<string>(initialTrackingCode);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [chartView, setChartView] = useState<'timeline' | 'distribution'>('timeline');

  // Private Live Chat State
  const [activeTab, setActiveTab] = useState<'tracking' | 'chat'>('tracking');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  const fetchChatMessages = async (code: string, markRead: boolean = true) => {
    if (!code) return;
    try {
      const url = `/api/chats/${code}/messages${markRead ? '?readBy=customer' : ''}`;
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const text = await res.text();
        if (text && text.trim().length > 0) {
          const data = JSON.parse(text);
          if (data && data.messages) {
            setChatMessages(data.messages);
            const unread = data.messages.filter((m: any) => m.sender === 'admin' && !m.readByCustomer).length;
            setUnreadChatCount(unread);
          }
        }
      }
    } catch (err) {
      // Chat background polling fail is non-fatal
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !order) return;
    const text = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);

    const localMsg: any = {
      id: `msg-${Date.now()}`,
      orderId: order.id,
      trackingCode: order.trackingCode,
      sender: 'customer',
      senderName: order.customer.name,
      text,
      createdAt: new Date().toISOString(),
      readByAdmin: false,
      readByCustomer: true,
    };

    setChatMessages((prev) => [...prev, localMsg]);
    setUnreadChatCount(0);

    // Save to localStorage as a backup and for Admin Panel discovery
    const CHAT_KEYS = ['queen_pending_support_chats', 'messages', 'chat_messages', 'queen_chat_messages'];
    CHAT_KEYS.forEach((key) => {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(localMsg);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
    });

    // Broadcast new chat message event for Admin Panel (same tab & other tabs)
    try {
      window.dispatchEvent(new CustomEvent('queen_new_chat_message', { detail: { message: localMsg } }));
      const channel = new BroadcastChannel('queen_orders_channel');
      channel.postMessage({ type: 'NEW_CHAT_MESSAGE', payload: localMsg, timestamp: Date.now() });
      channel.close();
    } catch {}

    // Notify Telegram via direct client side helper
    try {
      const tgText = `💬 <b>محادثة جديدة من طلب زبون</b>
━━━━━━━━━━━━━━━━━━━━
🔖 <b>رقم الطلب:</b> <code>#${order.trackingCode}</code>
👤 <b>الاسم:</b> <b>${order.customer.name}</b>
📞 <b>الهاتف:</b> <code>${order.customer.phone}</code>

✉️ <b>الرسالة:</b>
${text}
━━━━━━━━━━━━━━━━━━━━
<i>تم الإرسال من صفحة تتبع الطلب</i> ✨`;
      
      const { sendTelegramDirectClientSide } = await import('../utils/telegramClient');
      sendTelegramDirectClientSide(tgText).catch(() => {});
    } catch {}

    // Cloud sync chat message
    try {
      await sendChatMessageToFirestore(localMsg);
    } catch (err) {
      console.warn('Chat cloud sync error:', err);
    }

    setTimeout(() => {
      chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const res = await fetch(`/api/chats/${order.trackingCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'customer',
          senderName: order.customer.name,
          text,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const resText = await res.text();
        if (resText && resText.trim().length > 0) {
          const data = JSON.parse(resText);
          if (data && data.message) {
            setChatMessages((prev) => prev.map((m) => m.id === localMsg.id ? data.message : m));
          }
        }
      }
    } catch (err) {
      console.warn("Notice: Chat message saved locally in current session:", err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Poll chat messages periodically if chat is active or order is present
  useEffect(() => {
    if (!isOpen || !order?.trackingCode) return;

    fetchChatMessages(order.trackingCode, activeTab === 'chat');

    const interval = setInterval(() => {
      fetchChatMessages(order.trackingCode, activeTab === 'chat');
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, order?.trackingCode, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [activeTab, chatMessages.length]);

  // Clear active order and reset tracking
  const handleClearTracking = () => {
    try {
      localStorage.removeItem('active_order');
      localStorage.removeItem('queen_last_order_code');
    } catch (e) {
      console.error('Failed to clear active_order from localStorage:', e);
    }
    setOrder(null);
    setSearchCode('');
    if (onClearActiveOrder) {
      onClearActiveOrder();
    }
    onClose();
  };

  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrderByCustomer = async () => {
    if (!order) return;
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ سيتم إبلاغ الإدارة عبر التليجرام وحذف الطلب مباشرة.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const itemsText = (order.items || [])
        .map(
          (item: any, idx: number) =>
            `  ${idx + 1}. <b>${item.product?.name || 'منتج'}</b>\n     الكمية: <b>${item.quantity}</b> | السعر: ${((item.product?.price || 0) * item.quantity).toLocaleString('en-US')} د.ع`
        )
        .join('\n\n');

      const cancelMessage = `❌ <b>تم إلغاء الطلب من قبل الزبون</b>
━━━━━━━━━━━━━━━━━━━━
🔖 <b>رقم التتبع:</b> <code>#${order.trackingCode}</code>
👤 <b>اسم الزبون:</b> <b>${order.customer?.name}</b>
📞 <b>رقم الهاتف:</b> <code>${order.customer?.phone}</code>
📍 <b>العنوان:</b> ${order.customer?.governorate} - ${order.customer?.address}

📦 <b>المنتجات:</b>
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💵 <b>المبلغ الإجمالي:</b> <b>${(order.total || 0).toLocaleString('en-US')} د.ع</b>
<i>تم إلغاء الطلب من قبل الزبون مباشرة عبر الموقع</i> ⚠️`;

      await sendTelegramDirectClientSide(cancelMessage);
      await deleteOrderEverywhere(order.id || order.trackingCode);

      try {
        localStorage.removeItem('active_order');
        localStorage.removeItem('queen_last_order_code');
      } catch {}

      if (onClearActiveOrder) {
        onClearActiveOrder();
      }

      alert('تم إلغاء الطلب بنجاح وتم إبلاغ الإدارة.');
      setOrder(null);
      setSearchCode('');
      onClose();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert('حدث خطأ أثناء إلغاء الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Auto-fetch and populate from active_order in localStorage on mount / open
  useEffect(() => {
    if (!isOpen) return;

    // First: Check if full active_order is stored in localStorage
    try {
      const savedActiveOrder = localStorage.getItem('active_order');
      if (savedActiveOrder) {
        const parsedOrder = JSON.parse(savedActiveOrder);
        if (parsedOrder && (parsedOrder.trackingCode || parsedOrder.id)) {
          setOrder(parsedOrder);
          const code = parsedOrder.trackingCode || parsedOrder.id;
          setSearchCode(code);
          // Fetch fresh status in background silently
          fetchOrder(code, true);
          return;
        }
      }
    } catch (e) {
      console.error('Error parsing active_order:', e);
    }

    // Fallback if no active_order in localStorage
    if (initialTrackingCode) {
      setSearchCode(initialTrackingCode);
      fetchOrder(initialTrackingCode);
    } else {
      try {
        const lastCode = localStorage.getItem('queen_last_order_code');
        if (lastCode) {
          setSearchCode(lastCode);
          fetchOrder(lastCode);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen, initialTrackingCode]);

  // Periodic polling & real-time events for live updates when modal is active
  useEffect(() => {
    // 1. Listen to cross-tab & local window broadcast events
    const handleStatusChange = (e: any) => {
      const payload = e.detail || e.data?.payload;
      if (!payload) return;

      if (
        (order && (order.id === payload.orderId || order.trackingCode === payload.trackingCode)) ||
        (searchCode && searchCode.toUpperCase() === payload.trackingCode.toUpperCase())
      ) {
        if (payload.order) {
          setOrder(payload.order);
          try {
            localStorage.setItem('active_order', JSON.stringify(payload.order));
          } catch {}
        } else {
          setOrder((prev) => {
            if (!prev) return null;
            const updated = { ...prev, status: payload.newStatus, driverNotes: payload.driverNotes || prev.driverNotes };
            try {
              localStorage.setItem('active_order', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }

        if (payload.newStatus === 'delivered') {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
          });
        }
      }
    };

    window.addEventListener('queen_order_status_change', handleStatusChange);
    const channel = getOrdersBroadcastChannel();
    if (channel) {
      channel.addEventListener('message', (event) => {
        if (event.data?.type === 'ORDER_STATUS_CHANGED') {
          handleStatusChange(event);
        }
      });
    }

    if (!order || order.status === 'delivered' || order.status === 'cancelled') {
      return () => {
        window.removeEventListener('queen_order_status_change', handleStatusChange);
      };
    }

    const interval = setInterval(() => {
      if (order.trackingCode) {
        fetchOrder(order.trackingCode, true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('queen_order_status_change', handleStatusChange);
    };
  }, [order?.trackingCode, order?.status, searchCode]);

  // Chat Firestore Sync
  useEffect(() => {
    if (!order?.trackingCode) return;
    const unsubscribe = subscribeToChatRealtime(order.trackingCode, (msgs) => {
      if (msgs && msgs.length > 0) {
        setChatMessages(msgs);
        // Only mark as read if the tab is active and we are in chat view
        if (activeTab === 'chat' && isOpen) {
          setUnreadChatCount(0);
        } else {
          // Calculate unread by finding messages where readByCustomer is false
          const unread = msgs.filter(m => m.sender === 'admin' && !m.readByCustomer).length;
          setUnreadChatCount(unread);
        }
      }
    });
    return () => unsubscribe();
  }, [order?.trackingCode, activeTab, isOpen]);

  const fetchOrder = async (codeToFetch: string, silent: boolean = false) => {
    const cleanCode = codeToFetch.trim();
    if (!cleanCode) return;

    if (!silent) {
      setIsLoading(true);
      setError('');
    } else {
      setIsRefreshing(true);
    }

    try {
      const foundOrder = await findOrderByCode(cleanCode);

      if (foundOrder) {
        setOrder(foundOrder);
        setError('');
        try {
          localStorage.setItem('active_order', JSON.stringify(foundOrder));
          localStorage.setItem('queen_last_order_code', foundOrder.trackingCode);
        } catch (e) {
          console.error(e);
        }
        return;
      }

      throw new Error('لم يتم العثور على طلب بهذا الرمز. تأكد من إدخال الرمز بشكل صحيح.');
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'حدث خطأ أثناء البحث عن الطلب');
        setOrder(null);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      fetchOrder(searchCode);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStageIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'received':
        return 0;
      case 'preparing':
        return 1;
      case 'out_for_delivery':
        return 2;
      case 'delivered':
        return 3;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const currentStageIndex = order ? getStageIndex(order.status) : 0;

  // Percentage calculated for progress
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    if (order.status === 'cancelled') return 0;
    if (order.status === 'delivered') return 100;
    if (order.status === 'out_for_delivery') return 75;
    if (order.status === 'preparing') return 50;
    return 25;
  }, [order?.status]);

  // Stage timeline chart data for Recharts
  const stagesTimelineData = useMemo(() => {
    if (!order || order.status === 'cancelled') return [];
    
    return STAGES.map((s, idx) => {
      const isCompleted = idx < currentStageIndex;
      const isCurrent = idx === currentStageIndex;
      const progress = isCompleted ? 100 : isCurrent ? 65 : 10;
      
      let fill = '#A1A1AA';
      if (isCompleted) fill = '#10B981'; // Emerald
      else if (isCurrent) fill = '#C5A059'; // Gold
      
      return {
        name: s.title,
        shortName: s.title.replace('تم ', '').replace('جاري ', ''),
        step: idx + 1,
        progress: progress,
        status: isCompleted ? 'مكتمل ✓' : isCurrent ? 'قيد التنفيذ ⏳' : 'بانتظار البدء',
        estTime: s.estTime,
        fill: fill,
        icon: idx === 0 ? '📝' : idx === 1 ? '📦' : idx === 2 ? '🛵' : '🎉'
      };
    });
  }, [order?.status, currentStageIndex]);

  // Radial chart data for Recharts
  const radialData = useMemo(() => {
    return [
      {
        name: 'اكتمال الرحلة',
        value: completionPercentage,
        fill: completionPercentage === 100 ? '#10B981' : '#C5A059',
      },
    ];
  }, [completionPercentage]);

  // Financial & items breakdown data for Recharts Pie
  const breakdownPieData = useMemo(() => {
    if (!order) return [];

    const itemsData = order.items.map((item, idx) => ({
      name: item.product.name,
      value: item.product.price * item.quantity,
      color: ['#C5A059', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][idx % 6],
    }));

    if (order.deliveryFee > 0) {
      itemsData.push({
        name: 'أجور التوصيل',
        value: order.deliveryFee,
        color: '#64748B',
      });
    }

    return itemsData;
  }, [order]);

  const getTimingLabel = (timing: string, custom?: string) => {
    switch (timing) {
      case 'today':
        return 'اليوم بأسرع وقت';
      case 'tomorrow':
        return 'غداً';
      case 'this_week':
        return 'خلال هذا الأسبوع';
      case 'custom':
        return custom || 'موعد محدد من الزبون';
      default:
        return timing;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] rounded-2xl shadow-2xl border border-[#EAEAEA] dark:border-[#27272A] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:px-6 bg-[#1A1A1A] dark:bg-[#0D0D10] text-white flex items-center justify-between border-b border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#FFE58F]">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">تتبع حالة الطلب المباشر</h2>
              <p className="text-[11px] text-[#A1A1AA]">تحديث فوري ومباشر مع رسوم بيانية تفاعلية لحركة الشحنة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order && (
              <>
                <button
                  onClick={handleClearTracking}
                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="إلغاء تتبع هذا الطلب وإجراء طلب جديد"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">إلغاء التتبع / طلب جديد</span>
                  <span className="sm:hidden">طلب جديد</span>
                </button>

                <button
                  onClick={() => fetchOrder(order.trackingCode)}
                  disabled={isRefreshing || isLoading}
                  className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="تحديث الحالة الآن"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C5A059]' : ''}`} />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Search Bar */}
        <div className="p-4 bg-[#FAFAFA] dark:bg-[#18181C] border-b border-[#EAEAEA] dark:border-[#27272A]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="أدخل رمز التتبع (مثال: ORD-4921)..."
                dir="ltr"
                className="w-full bg-white dark:bg-[#141418] border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-xl pl-4 pr-10 py-2.5 text-xs sm:text-sm font-mono font-bold text-center outline-hidden tracking-wider uppercase text-[#1A1A1A] dark:text-white"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            </div>

            <button
              type="submit"
              disabled={isLoading || !searchCode.trim()}
              className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] disabled:opacity-50 text-white dark:text-black font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {isLoading ? 'جاري البحث...' : 'تتبع الطلب'}
            </button>
          </form>

          {error && (
            <div className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading && !order ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#C5A059] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#666666] dark:text-[#A1A1AA]">جاري تحميل بيانات الشحنة المباشرة...</p>
            </div>
          ) : order ? (
            <>
              {/* Order Status Badge Header */}
              <div className="bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] dark:from-[#18181C] dark:to-[#141418] p-4 sm:p-5 rounded-2xl border border-[#EAEAEA] dark:border-[#27272A] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#666666] dark:text-[#A1A1AA]">رمز التتبع الموحد:</span>
                    <button
                      onClick={() => handleCopyCode(order.trackingCode)}
                      className="inline-flex items-center gap-1.5 bg-white dark:bg-[#202026] border border-[#EAEAEA] dark:border-[#2E2E35] hover:border-[#C5A059] px-2.5 py-1 rounded-lg font-mono font-bold text-sm text-[#1A1A1A] dark:text-white transition-colors cursor-pointer shadow-2xs"
                      title="نسخ رمز التتبع"
                    >
                      <span>#{order.trackingCode}</span>
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#999999]" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[#999999] dark:text-[#71717A]">
                    تاريخ الطلب: {new Date(order.createdAt).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="text-left">
                  {order.status === 'cancelled' ? (
                    <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-xs px-3.5 py-1.5 rounded-full border border-rose-300 dark:border-rose-800">
                      تم إلغاء الطلب
                    </span>
                  ) : order.status === 'delivered' ? (
                    <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs px-3.5 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>تم التوصيل بنجاح 🎉</span>
                    </span>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                          مباشر: {STAGES[Math.max(0, currentStageIndex)]?.title}
                        </span>
                      </div>
                      <button
                        onClick={handleCancelOrderByCustomer}
                        disabled={isCancelling}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{isCancelling ? 'جاري الإلغاء...' : '❌ إلغاء الطلب'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub Nav Tabs: Tracking vs Private Live Chat */}
              <div className="flex items-center gap-2 bg-[#F4F4F5] dark:bg-[#18181C] p-1.5 rounded-2xl border border-[#EAEAEA] dark:border-[#27272A]">
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'tracking'
                      ? 'bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black shadow-xs'
                      : 'text-[#666666] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>تتبع حالة الشحنة 🚚</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('chat');
                    if (order?.trackingCode) {
                      fetchChatMessages(order.trackingCode, true);
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
                    activeTab === 'chat'
                      ? 'bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black shadow-xs'
                      : 'text-[#666666] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>محادثة الطلب المباشرة 💬</span>
                  {unreadChatCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white dark:border-black animate-pulse">
                      {unreadChatCount} جديد
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'chat' ? (
                /* Private Live Chat Section */
                <div className="bg-[#FAFAFA] dark:bg-[#18181C] p-4 sm:p-5 rounded-2xl border border-[#EAEAEA] dark:border-[#27272A] space-y-4">
                  {/* Chat Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAEAEA] dark:border-[#27272A]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#1A1A1A] dark:text-white flex items-center gap-2">
                          <span>المحادثات المباشرة مع إدارة كوزمتك الملكة 👑</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            متصل
                          </span>
                        </h3>
                        <p className="text-[11px] text-[#A1A1AA]">
                          محادثة خاصة ومضمونة للطلب #{order.trackingCode} | اسم الزبون: {order.customer.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Message Box */}
                  <div className="h-[340px] overflow-y-auto space-y-3 p-3 bg-white dark:bg-[#0D0D10] rounded-xl border border-[#EAEAEA] dark:border-[#27272A]">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white">أهلاً بك يا {order.customer.name}! 👋</h4>
                          <p className="text-xs text-[#888888] dark:text-[#A1A1AA] leading-relaxed">
                            يسعدنا تواصلك معنا. إذا كان لديك أي سؤال أو استفسار أو تعديل على الطلب #{order.trackingCode}، اكتبه هنا وسيقوم كادر الإدارة بالرد عليك فوراً!
                          </p>
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isAdmin = msg.sender === 'admin';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'} space-y-1`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-[#888888] dark:text-[#888888] px-1">
                              {isAdmin ? (
                                <>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    إدارة كوزمتك الملكة 👑
                                  </span>
                                  <span>•</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-[#C5A059] flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    أنت ({order.customer.name})
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div
                              className={`max-w-[82%] sm:max-w-[75%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isAdmin
                                  ? 'bg-emerald-950/80 dark:bg-emerald-950/90 text-emerald-100 border border-emerald-500/40 rounded-tr-none shadow-xs'
                                  : 'bg-[#C5A059] text-black font-semibold rounded-tl-none shadow-xs'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatScrollRef} />
                  </div>

                  {/* Chat Form Input */}
                  <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="اكتب رسالتك للإدارة هنا..."
                      className="flex-1 bg-white dark:bg-[#141418] border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-xl px-4 py-3 text-xs sm:text-sm outline-hidden text-[#1A1A1A] dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isSendingChat || !chatInput.trim()}
                      className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] disabled:opacity-50 text-white dark:text-black font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <span>إرسال</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Interactive Recharts Delivery Analytics & Stages Visualizer */}
                  {order.status !== 'cancelled' && (
                <div className="bg-[#FAFAFA] dark:bg-[#18181C] p-4 sm:p-5 rounded-2xl border border-[#EAEAEA] dark:border-[#27272A] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEAEA] dark:border-[#27272A] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                          <span>لوحة المؤشرات البيانية للطلب (Recharts)</span>
                          <span className="text-[10px] bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded-full font-mono">
                            {completionPercentage}% اكتمال
                          </span>
                        </h3>
                      </div>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#141418] p-1 rounded-xl border border-[#EAEAEA] dark:border-[#2E2E35]">
                      <button
                        onClick={() => setChartView('timeline')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          chartView === 'timeline'
                            ? 'bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black shadow-xs'
                            : 'text-[#666666] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>مراحل الشحن</span>
                      </button>
                      <button
                        onClick={() => setChartView('distribution')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          chartView === 'distribution'
                            ? 'bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black shadow-xs'
                            : 'text-[#666666] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white'
                        }`}
                      >
                        <PieChartIcon className="w-3.5 h-3.5" />
                        <span>توزيع التكلفة</span>
                      </button>
                    </div>
                  </div>

                  {chartView === 'timeline' ? (
                    <div className="space-y-3">
                      {/* Timeline Bar & Area Combined Chart */}
                      <div className="h-44 sm:h-48 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={stagesTimelineData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <XAxis
                              dataKey="shortName"
                              tick={{ fontSize: 11, fill: '#888888' }}
                              axisLine={{ stroke: '#EAEAEA' }}
                              tickLine={false}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fontSize: 10, fill: '#888888' }}
                              axisLine={false}
                              tickLine={false}
                              unit="%"
                            />
                            <Tooltip content={<CustomStageTooltip />} />
                            <Bar
                              dataKey="progress"
                              radius={[8, 8, 0, 0]}
                              animationDuration={1000}
                            >
                              {stagesTimelineData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.fill}
                                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Interactive Stage Info Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {stagesTimelineData.map((st, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border transition-all text-center ${
                              i === currentStageIndex
                                ? 'bg-amber-500/10 border-[#C5A059] shadow-2xs'
                                : i < currentStageIndex
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-white dark:bg-[#141418] border-[#EAEAEA] dark:border-[#27272A] opacity-70'
                            }`}
                          >
                            <div className="text-sm mb-0.5">{st.icon}</div>
                            <p className="font-bold text-xs text-[#1A1A1A] dark:text-white truncate">
                              {st.name}
                            </p>
                            <span className="text-[10px] text-[#666666] dark:text-[#A1A1AA] block mt-0.5">
                              {st.estTime}
                            </span>
                            <span
                              className={`text-[9px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded-full ${
                                i === currentStageIndex
                                  ? 'bg-[#C5A059] text-black'
                                  : i < currentStageIndex
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#EAEAEA] dark:bg-[#27272A] text-[#71717A]'
                              }`}
                            >
                              {st.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                      {/* Pie chart */}
                      <div className="h-44 w-full sm:w-1/2 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={breakdownPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={38}
                              outerRadius={68}
                              paddingAngle={4}
                              dataKey="value"
                              animationDuration={800}
                            >
                              {breakdownPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomFinanceTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend breakdown list */}
                      <div className="w-full sm:w-1/2 space-y-2 text-xs">
                        <p className="font-bold text-xs text-[#1A1A1A] dark:text-white mb-2">
                          تفاصيل القيمة الإجمالية للطلب:
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {breakdownPieData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-[#666666] dark:text-[#A1A1AA] truncate text-[11px]">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-bold text-[#1A1A1A] dark:text-white shrink-0 text-[11px]">
                                {formatIQD(item.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Visual Multi-Stage Progress Stepper */}
              {order.status !== 'cancelled' && (
                <div className="py-2 px-1">
                  <h3 className="font-bold text-xs sm:text-sm text-[#1A1A1A] dark:text-white mb-5 flex items-center gap-2">
                    <span>خط سير الطلب والمراحل التفصيلية:</span>
                    <span className="text-[11px] text-[#999999] dark:text-[#71717A] font-normal">
                      (المرحلة {currentStageIndex + 1} من 4)
                    </span>
                  </h3>

                  {/* Horizontal Stepper */}
                  <div className="relative">
                    {/* Connecting Line */}
                    <div className="absolute top-6 right-8 left-8 h-1 bg-[#EAEAEA] dark:bg-[#27272A] -z-0 hidden sm:block">
                      <div
                        className="h-full bg-gradient-to-r from-[#C5A059] to-emerald-500 transition-all duration-500"
                        style={{
                          width: `${(Math.max(0, currentStageIndex) / (STAGES.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
                      {STAGES.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isCompleted = idx < currentStageIndex;
                        const isCurrent = idx === currentStageIndex;

                        return (
                          <div
                            key={stage.id}
                            className={`flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2 p-3 sm:p-2 rounded-xl transition-all ${
                              isCurrent
                                ? 'bg-amber-50/80 dark:bg-amber-950/20 sm:bg-transparent border border-amber-200 dark:border-amber-800/40 sm:border-transparent shadow-2xs'
                                : ''
                            }`}
                          >
                            {/* Step Circle */}
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all shrink-0 ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                  : isCurrent
                                  ? 'bg-transparent ring-0 scale-110'
                                  : 'bg-[#F0F0F0] dark:bg-[#202026] text-[#999999] dark:text-[#71717A] border border-[#EAEAEA] dark:border-[#2E2E35]'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-5 h-5 stroke-[3]" />
                              ) : isCurrent ? (
                                <StatusAnimatedIcon status={stage.id} size="sm" />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                            </div>

                            {/* Label */}
                            <div className="flex-1 sm:w-full">
                              <h4
                                className={`font-bold text-xs leading-snug ${
                                  isCurrent
                                    ? 'text-[#1A1A1A] dark:text-white'
                                    : isCompleted
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-[#999999] dark:text-[#71717A]'
                                }`}
                              >
                                {stage.title}
                              </h4>
                              <p className="text-[11px] text-[#777777] dark:text-[#A1A1AA] mt-0.5 leading-tight line-clamp-2 sm:line-clamp-none">
                                {stage.subtitle}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Details & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer & Delivery Card */}
                <div className="bg-[#FAFAFA] dark:bg-[#18181C] p-4 rounded-xl border border-[#EAEAEA] dark:border-[#27272A] space-y-3">
                  <h4 className="font-bold text-xs text-[#1A1A1A] dark:text-white flex items-center gap-1.5 border-b border-[#EAEAEA] dark:border-[#27272A] pb-2">
                    <MapPin className="w-4 h-4 text-[#C5A059]" />
                    <span>عنوان وبيانات الاستلام</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#666666] dark:text-[#A1A1AA]">المستلم:</span>
                      <span className="font-semibold text-[#1A1A1A] dark:text-white">{order.customer.name}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#666666] dark:text-[#A1A1AA]">الهاتف:</span>
                      <a
                        href={`tel:${order.customer.phone}`}
                        dir="ltr"
                        className="font-semibold text-[#1A1A1A] dark:text-white hover:underline hover:text-[#C5A059]"
                      >
                        {order.customer.phone}
                      </a>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#666666] dark:text-[#A1A1AA]">المحافظة / المنطقة:</span>
                      <span className="font-semibold text-[#1A1A1A] dark:text-white">{order.customer.governorate}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#666666] dark:text-[#A1A1AA]">العنوان:</span>
                      <span className="font-semibold text-[#1A1A1A] dark:text-white text-left">{order.customer.address}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-[#EAEAEA] dark:border-[#27272A]">
                      <span className="text-[#666666] dark:text-[#A1A1AA] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>موعد التوصيل:</span>
                      </span>
                      <span className="font-bold text-[#1A1A1A] dark:text-white bg-white dark:bg-[#141418] px-2 py-0.5 rounded-md border border-[#EAEAEA] dark:border-[#2E2E35]">
                        {getTimingLabel(order.deliveryTiming, order.customTimingText)}
                      </span>
                    </div>
                  </div>

                  {/* GPS Google Maps Link */}
                  {order.location && (
                    <div className="pt-2">
                      <a
                        href={order.location.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors shadow-xs"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>عرض موقع التسليم على خرائط Google</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Items Summary Card */}
                <div className="bg-[#FAFAFA] dark:bg-[#18181C] p-4 rounded-xl border border-[#EAEAEA] dark:border-[#27272A] space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[#1A1A1A] dark:text-white flex items-center gap-1.5 border-b border-[#EAEAEA] dark:border-[#27272A] pb-2">
                      <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
                      <span>المنتجات المطلوبة ({order.items.reduce((acc, i) => acc + i.quantity, 0)})</span>
                    </h4>

                    <div className="space-y-2 text-xs mt-3 max-h-36 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 py-1 border-b border-[#EAEAEA]/60 dark:border-[#27272A] last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.product.image ? (
                              <img
                                src={getProductImageUrl(item.product)}
                                alt={item.product.name}
                                className="w-8 h-8 rounded-md object-contain bg-white border border-[#EAEAEA] dark:border-[#2E2E35]"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-[#F8F8F8] dark:bg-[#202026] border border-[#EAEAEA] dark:border-[#2E2E35] shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="font-semibold text-[#1A1A1A] dark:text-white truncate">{item.product.name}</p>
                              <p className="text-[10px] text-[#888888] dark:text-[#A1A1AA]">الكمية: {item.quantity} × {formatIQD(item.product.price)}</p>
                            </div>
                          </div>
                          <span className="font-bold text-[#1A1A1A] dark:text-white shrink-0">
                            {formatIQD(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="pt-2 border-t border-[#EAEAEA] dark:border-[#27272A] space-y-1 text-xs">
                    <div className="flex justify-between text-[#666666] dark:text-[#A1A1AA]">
                      <span>المجموع:</span>
                      <span className="font-semibold text-[#1A1A1A] dark:text-white">{formatIQD(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>الخصم:</span>
                        <span>-{formatIQD(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#666666] dark:text-[#A1A1AA]">
                      <span>التوصيل:</span>
                      <span className="font-semibold text-[#1A1A1A] dark:text-white">{order.deliveryFee === 0 ? 'مجاني' : formatIQD(order.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#1A1A1A] dark:text-white pt-1 border-t border-[#EAEAEA] dark:border-[#27272A]">
                      <span>المبلغ الإجمالي (دفع عند الاستلام):</span>
                      <span className="text-[#C5A059] dark:text-[#FFE58F] font-bold text-base">{formatIQD(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver note if available */}
              {order.driverNotes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">ملاحظات التجهيز والتوصيل: </span>
                    <span>{order.driverNotes}</span>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#EAEAEA] dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleClearTracking}
                  className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>طلب جديد</span>
                </button>

                <a
                  href={generateOrderConfirmationWhatsAppUrl(order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>إرسال الطلب عبر واتساب للتأكيد الفوري 💬</span>
                </a>

                <div className="text-center text-xs text-[#888888] dark:text-[#A1A1AA]">
                  <span>واتساب المتجر: </span>
                  <a
                    href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent(`مرحباً كوزمتك الملكة، أود الاستفسار عن طلبي برقم #${order.trackingCode}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#25D366] hover:underline"
                    dir="ltr"
                  >
                    {STORE_INFO.displayPhone}
                  </a>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F5F5F5] dark:bg-[#1E1E24] flex items-center justify-center text-[#999999] dark:text-[#71717A] mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#1A1A1A] dark:text-white">أدخل رمز التتبع للبدء</h3>
              <p className="text-xs text-[#888888] dark:text-[#A1A1AA] max-w-sm mx-auto">
                ستحصل على رمز تتبع فريد (مثل #ORD-4921) فور تثبيت أي طلب داخل المتجر لمتابعة حالته لحظة بلحظة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

