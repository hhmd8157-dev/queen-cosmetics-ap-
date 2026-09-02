import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Phone, User, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';
import { sendTelegramDirectClientSide } from '../utils/telegramClient';
import { sendChatMessageToFirestore, subscribeToChatRealtime } from '../services/chatsFirestoreService';

interface SupportContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessMessage?: (msg: string) => void;
}

export const SupportContactModal: React.FC<SupportContactModalProps> = ({
  isOpen,
  onClose,
  onSuccessMessage,
}) => {
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Active Thread & Messages State
  const [activeSupportCode, setActiveSupportCode] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyInput, setReplyInput] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Restore existing active support code on mount or modal open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedCode = localStorage.getItem('queen_last_support_code');
      if (savedCode) {
        setActiveSupportCode(savedCode);
      }
    } catch {}
  }, [isOpen]);

  // Real-time synchronization for active support code
  useEffect(() => {
    if (!isOpen || !activeSupportCode) return;

    const upperCode = activeSupportCode.toUpperCase();

    // 1. Initial load from localStorage
    const CHAT_KEYS = ['queen_pending_support_chats', 'messages', 'chat_messages', 'queen_chat_messages'];
    const foundMsgs: any[] = [];
    CHAT_KEYS.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((m: any) => {
              if ((m.orderId || m.trackingCode || '').toUpperCase() === upperCode) {
                if (!foundMsgs.some((x) => x.id === m.id)) {
                  foundMsgs.push(m);
                }
              }
            });
          }
        }
      } catch {}
    });
    if (foundMsgs.length > 0) {
      foundMsgs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      setChatMessages(foundMsgs);
    }

    // 2. Real-time Firestore subscription
    const unsubscribe = subscribeToChatRealtime(upperCode, (incoming) => {
      if (Array.isArray(incoming) && incoming.length > 0) {
        setChatMessages(incoming);
      }
    });

    // 3. Same-tab Custom Event listener
    const handleIncomingChatMessage = (e: any) => {
      const msg = e.detail?.message;
      if (msg && (msg.orderId || msg.trackingCode || '').toUpperCase() === upperCode) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            return prev.map((m) => (m.id === msg.id ? msg : m));
          }
          return [...prev, msg];
        });
        if (msg.sender === 'admin') {
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          } catch {}
        }
      }
    };
    window.addEventListener('queen_new_chat_message', handleIncomingChatMessage as any);

    // 4. Cross-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('queen_orders_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data?.payload) {
          const msg = event.data.payload;
          if ((msg.orderId || msg.trackingCode || '').toUpperCase() === upperCode) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) {
                return prev.map((m) => (m.id === msg.id ? msg : m));
              }
              return [...prev, msg];
            });
            if (msg.sender === 'admin') {
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {});
              } catch {}
            }
          }
        }
      };
    } catch {}

    return () => {
      unsubscribe();
      window.removeEventListener('queen_new_chat_message', handleIncomingChatMessage as any);
      if (channel) {
        channel.close();
      }
    };
  }, [isOpen, activeSupportCode]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatMessages.length]);

  if (!isOpen) return null;

  // Initial Form Submit (Creates ticket + initial message)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanMessage = message.trim();

    if (!cleanName) {
      setErrorMsg('يرجى إدخال اسمك الكريم');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح للتواصل');
      return;
    }
    if (!cleanMessage) {
      setErrorMsg('يرجى كتابة نص الرسالة أو الاستفسار');
      return;
    }

    setIsSubmitting(true);

    const supportCode = `SUPP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: supportCode,
      trackingCode: supportCode,
      sender: 'customer',
      senderName: cleanName,
      customerPhone: cleanPhone,
      governorate: 'العراق',
      text: cleanMessage,
      createdAt: new Date().toISOString(),
      readByAdmin: false,
      readByCustomer: true,
      status: 'pending',
    };

    setActiveSupportCode(supportCode);
    setChatMessages([newChatMessage]);
    try {
      localStorage.setItem('queen_last_support_code', supportCode);
    } catch {}

    // Save immediately to unified localStorage keys
    const CHAT_KEYS = ['queen_pending_support_chats', 'messages', 'chat_messages', 'queen_chat_messages'];
    CHAT_KEYS.forEach((key) => {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(newChatMessage);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
    });

    // Cloud Sync
    try {
      await sendChatMessageToFirestore(newChatMessage as any);
    } catch (err) {
      console.warn('Chat cloud sync error:', err);
    }

    // Broadcast new chat message event for Admin Panel (same tab & other tabs)
    try {
      window.dispatchEvent(new CustomEvent('queen_new_chat_message', { detail: { message: newChatMessage } }));
      const channel = new BroadcastChannel('queen_orders_channel');
      channel.postMessage({ type: 'NEW_CHAT_MESSAGE', payload: newChatMessage, timestamp: Date.now() });
      channel.close();
    } catch {}

    try {
      // Send direct client-side telegram notification
      const tgText = `💬 <b>رسالة جديدة من زبون الدعم الفني</b>
━━━━━━━━━━━━━━━━━━━━
🔖 <b>رقم الدعم:</b> <code>#${supportCode}</code>
👤 <b>الاسم:</b> <b>${cleanName}</b>
📞 <b>الهاتف:</b> <code>${cleanPhone}</code>

✉️ <b>الرسالة:</b>
${cleanMessage}
━━━━━━━━━━━━━━━━━━━━
<i>تم الإرسال من الموقع المباشر</i> ✨`;
      
      sendTelegramDirectClientSide(tgText).catch((tgErr) => {
        console.warn('Direct telegram client send notice:', tgErr);
      });

      // Post to backend chat API
      fetch(`/api/chats/${supportCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'customer',
          senderName: cleanName,
          customerPhone: cleanPhone,
          governorate: 'العراق',
          text: cleanMessage,
        }),
      }).catch(() => {});

      if (onSuccessMessage) {
        onSuccessMessage('تم إرسال رسالتك إلى إدارة المتجر بنجاح!');
      }
    } catch (err) {
      if (onSuccessMessage) {
        onSuccessMessage('تم إرسال رسالتك بنجاح!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer sending a follow-up reply in the active chat thread
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyInput.trim() || !activeSupportCode) return;

    const text = replyInput.trim();
    setReplyInput('');
    setIsSendingReply(true);

    const followUpMsg: any = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: activeSupportCode.toUpperCase(),
      trackingCode: activeSupportCode.toUpperCase(),
      sender: 'customer',
      senderName: name || 'زبون الدعم',
      customerPhone: phone || '',
      governorate: 'العراق',
      text,
      createdAt: new Date().toISOString(),
      readByAdmin: false,
      readByCustomer: true,
      status: 'pending',
    };

    setChatMessages((prev) => [...prev, followUpMsg]);

    // Save to LocalStorage
    const CHAT_KEYS = ['queen_pending_support_chats', 'messages', 'chat_messages', 'queen_chat_messages'];
    CHAT_KEYS.forEach((key) => {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(followUpMsg);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
    });

    // Broadcast
    try {
      window.dispatchEvent(new CustomEvent('queen_new_chat_message', { detail: { message: followUpMsg } }));
      const channel = new BroadcastChannel('queen_orders_channel');
      channel.postMessage({ type: 'NEW_CHAT_MESSAGE', payload: followUpMsg, timestamp: Date.now() });
      channel.close();
    } catch {}

    // Cloud Save
    try {
      await sendChatMessageToFirestore(followUpMsg);
    } catch {}

    // Send to Telegram & Backend
    try {
      const tgText = `💬 <b>متابعة جديدة من زبون الدعم الفني</b>
━━━━━━━━━━━━━━━━━━━━
🔖 <b>رقم الدعم:</b> <code>#${activeSupportCode}</code>
👤 <b>الاسم:</b> <b>${name || 'زبون الدعم'}</b>
📞 <b>الهاتف:</b> <code>${phone || '-'}</code>

✉️ <b>الرسالة:</b>
${text}
━━━━━━━━━━━━━━━━━━━━`;
      sendTelegramDirectClientSide(tgText).catch(() => {});

      fetch(`/api/chats/${activeSupportCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpMsg),
      }).catch(() => {});
    } catch {} finally {
      setIsSendingReply(false);
    }
  };

  const handleStartNewInquiry = () => {
    setActiveSupportCode('');
    setChatMessages([]);
    setMessage('');
    setErrorMsg('');
    try {
      localStorage.removeItem('queen_last_support_code');
    } catch {}
  };

  const handleResetAndClose = () => {
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      id="support-contact-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={handleResetAndClose}
    >
      <div
        id="support-contact-modal-container"
        className="relative bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] w-full max-w-lg rounded-2xl shadow-2xl border border-[#EAEAEA] dark:border-[#27272A] overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-[#EAEAEA] dark:border-[#27272A] flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-transparent to-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>تواصل مع الإدارة والدعم الفني 💬</span>
                {activeSupportCode && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    #{activeSupportCode}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-[#A1A1AA]">
                محادثة حية ومباشرة تصل فوراً إلى لوحة تحكم الإدارة وتطبيق التليجرام
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#27272A] hover:bg-gray-200 dark:hover:bg-[#3F3F46] flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {activeSupportCode ? (
            /* Active Live Chat Thread View */
            <div className="space-y-3">
              {/* Chat Status Banner */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>المحادثة نشطة مع الإدارة</span>
                </div>
                <button
                  type="button"
                  onClick={handleStartNewInquiry}
                  className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>فتح استفسار جديد</span>
                </button>
              </div>

              {/* Chat Messages Box */}
              <div className="h-[280px] sm:h-[320px] overflow-y-auto space-y-3 p-3 bg-gray-50 dark:bg-[#0D0D10] rounded-xl border border-gray-200 dark:border-[#27272A]">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <Sparkles className="w-8 h-8 text-amber-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      جاري مزامنة المحادثة مع الإدارة...
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'} space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-1">
                          {isAdmin ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              إدارة كوزمتك الملكة 👑
                            </span>
                          ) : (
                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              أنت ({msg.senderName || name || 'الزبون'})
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString('ar-IQ', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[78%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isAdmin
                              ? 'bg-emerald-950/80 dark:bg-emerald-900 text-emerald-100 border border-emerald-500/40 rounded-tr-none shadow-sm'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-tl-none shadow-sm'
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

              {/* Follow-up Reply Input */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="اكتب ردك أو استفسارك الإضافي هنا..."
                  className="flex-1 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272A] focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-hidden text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isSendingReply || !replyInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال</span>
                </button>
              </form>
            </div>
          ) : (
            /* Initial Inquiry Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  اسمك الكريم <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    required
                    className="w-full bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272A] focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white outline-hidden"
                  />
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  رقم الهاتف للتواصل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07801234567"
                    required
                    dir="ltr"
                    className="w-full bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272A] focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white outline-hidden text-right"
                  />
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  نص الرسالة أو الاستفسار <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب استفسارك أو طلبك هنا..."
                  rows={4}
                  required
                  className="w-full bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272A] focus:border-emerald-500 rounded-xl p-3 text-xs sm:text-sm text-gray-900 dark:text-white outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#27272A] hover:bg-gray-200 dark:hover:bg-[#3F3F46] text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <span>جاري إرسال الرسالة...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>بدء المحادثة مع الإدارة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-gray-50 dark:bg-[#18181C] border-t border-[#EAEAEA] dark:border-[#27272A] text-center text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>رسالتك محمية وتصل بشكل مباشر وفوري إلى لوحة تحكم إدارة المتجر</span>
        </div>
      </div>
    </div>
  );
};
