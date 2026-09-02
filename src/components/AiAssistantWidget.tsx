import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  MessageCircle,
  ChevronDown,
  Crown,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { STORE_INFO } from '../data/products';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  status?: 'loading' | 'sent' | 'failed';
}

const QUICK_PROMPTS = [
  'اقترح لي كورس عناية بالبشرة المختلطة',
  'شلون أعرف نوع بشرتي بدقة؟',
  'شنو الفرق بين العطر الأصلي والتيستر؟',
  'شكد ثباتية البخور واللبان في متجركم؟',
  'روتين واقعي لتكثيف الشعر وعلاج التساقط',
  'شلون أصنع خلطة بخوري الخاصة بسعر 5000؟',
];

const INITIAL_GREETING: Message = {
  id: 'msg-init',
  role: 'assistant',
  content: `أهلاً بك في **كوزمتك الملكة** 👑✨

أنا **مستشارك الذكي المباشر** المدعوم بالذكاء الاصطناعي في عالم الجمال، العناية بالبشرة، الشعر، المكياج، والعطور والبخور.

أقدّم لك دائماً النصيحة الصادقة والعلمية الدقيقة بدون أي مبالغات تسويقية. تفضل بالسؤال عن أي منتج عالمي أو روتين تريده!`,
  timestamp: 'الآن',
};

export const AiAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showNotificationBadge, setShowNotificationBadge] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowNotificationBadge(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      status: 'loading',
    };

    // Prepare previous history (excluding error messages and initial greeting)
    const validHistory = messages
      .filter((m) => m.id !== 'msg-init' && !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: validHistory,
          userMessage: text,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply;

      if (!replyText) {
        throw new Error('لم يتم استلام رد من النموذج');
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) =>
        prev.map((m): Message => (m.id === userMsgId ? { ...m, status: 'sent' } : m)).concat(assistantMsg)
      );
    } catch (err: any) {
      console.error('AI chat live request failed:', err);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `عذراً، حدث خطأ مؤقت في الاتصال بنموذج الذكاء الاصطناعي (${err?.message || 'يرجى التحقق من المفتاح أو الاتصال'}). يرجى إعادة المحاولة أو مراسلتنا مباشرة على الواتساب.`,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      setMessages((prev) =>
        prev.map((m): Message => (m.id === userMsgId ? { ...m, status: 'failed' } : m)).concat(errorMessage)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_GREETING]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {/* Floating Bubble Tooltip */}
        {!isOpen && showNotificationBadge && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-2 bg-[#18181B] text-white border border-[#D4AF37]/50 px-3.5 py-1.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
            <span>اسأل مستشار الملكة الذكي 🤖</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotificationBadge(false);
              }}
              className="text-[#A1A1AA] hover:text-white mr-1"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* The Action Button */}
        <motion.button
          id="ai-assistant-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
            isOpen
              ? 'bg-[#27272A] text-white border border-[#3F3F46]'
              : 'bg-gradient-to-tr from-[#1E1B18] via-[#2A241B] to-[#121214] border-2 border-[#D4AF37] text-[#D4AF37] shadow-[#D4AF37]/25'
          }`}
          title="مستشار كوزمتك الملكة الذكي"
        >
          {/* Animated Gold Ring */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C5A059] opacity-40 blur-xs animate-pulse -z-10" />
          )}

          {isOpen ? (
            <ChevronDown className="w-7 h-7" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 text-[#D4AF37]" />
              <Crown className="w-3.5 h-3.5 text-[#FFE58F] absolute -top-2 -right-1" />
            </div>
          )}

          {/* Online Dot */}
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#121214] rounded-full" />
        </motion.button>
      </div>

      {/* Pop-up Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-22 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[85vh] h-[620px] bg-[#141417] text-white rounded-2xl border border-[#2B2B30] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1E1B18] via-[#241F16] to-[#141417] border-b border-[#2E2E33] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#2A241B] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37]">
                    <Bot className="w-5 h-5" />
                  </div>
                  <Crown className="w-3.5 h-3.5 text-[#D4AF37] absolute -top-1 -right-1" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#141417]" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white">
                      مستشار كوزمتك الملكة الذكي
                    </h3>
                    <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#D4AF37]/40">
                      AI Live
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>توليد فوري ذكي • نصائح علمية دقيقة</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetChat}
                  title="محادثة جديدة"
                  className="w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#25252A] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="إغلاق"
                  className="w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252A] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm bg-[#0E0E10]/90">
              {(Array.isArray(messages) ? messages : []).map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 shadow-md relative group ${
                        isUser
                          ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#121214] font-medium rounded-br-xs'
                          : msg.isError
                          ? 'bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-bl-xs'
                          : 'bg-[#1C1C20] text-gray-100 border border-[#2E2E33] rounded-bl-xs'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="leading-relaxed space-y-2">
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : msg.isError ? (
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-rose-300">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <p className="text-xs">{msg.content}</p>
                            </div>
                            <button
                              onClick={() => {
                                // Find last user message
                                const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                                if (lastUserMsg) {
                                  // Remove error message and retry
                                  setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                                  handleSendMessage(lastUserMsg.content);
                                }
                              }}
                              disabled={isLoading}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] bg-rose-900/60 hover:bg-rose-800 text-white px-2.5 py-1 rounded-lg border border-rose-700/50 transition-colors cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                              <span>إعادة المحاولة الآن</span>
                            </button>
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-xs max-w-none text-gray-200 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-[#FFE58F]">
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions for assistant answers */}
                      {!isUser && !msg.isError && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#A1A1AA]">
                          <span>{msg.timestamp}</span>
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>نسخ النص</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {isUser && (
                        <div className="text-[10px] text-[#121214]/75 text-left mt-1 flex items-center justify-end gap-1 font-medium">
                          <span>{msg.timestamp}</span>
                          {msg.status === 'loading' && (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#121214]/60" />
                          )}
                          {msg.status === 'sent' && (
                            <Check className="w-2.5 h-2.5 text-emerald-800" />
                          )}
                          {msg.status === 'failed' && (
                            <span title="فشل في الإرسال">
                              <AlertCircle className="w-2.5 h-2.5 text-rose-800 animate-pulse" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing / Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-[#D4AF37] bg-[#1C1C20] border border-[#2E2E33] px-3.5 py-2.5 rounded-2xl w-fit">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-medium">المستشار يكتب لك الرد المباشر...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-2.5 bg-[#141417] border-t border-[#222226] overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="text-[10px] font-bold text-[#D4AF37] shrink-0 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  <span>اقتراحات سريعة:</span>
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="shrink-0 text-[11px] bg-[#1F1F23] hover:bg-[#2A2A30] hover:text-[#D4AF37] text-[#D4D4D8] border border-[#2E2E33] px-2.5 py-1 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#18181B] border-t border-[#27272A]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  id="ai-advisor-input"
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="اسأل عن أي منتج، روتين بشرة، عطر، أو بخور..."
                  disabled={isLoading}
                  className="flex-1 bg-[#101012] border border-[#2E2E33] focus:border-[#D4AF37] text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
                />

                <button
                  id="ai-advisor-send-btn"
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-[#121214] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md shadow-[#C5A059]/20"
                  title="إرسال"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </form>

              {/* Direct WhatsApp Consultation Sub-link */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-[#71717A] px-1">
                <span>كوزمتك الملكة • العراق - البصرة</span>
                <a
                  href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent('مرحباً كوزمتك الملكة، أود استشارة مباشرة لطلب منتجات')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#25D366] hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>تثبيت طلبك عبر الواتساب</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
