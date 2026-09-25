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
import { STORE_WHATSAPP_NUMBER } from '../utils/whatsapp';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  status?: 'loading' | 'sent' | 'failed';
}

const QUICK_PROMPTS = [
  'اقترح لي روتين عناية بالبشرة الدهنية والمختلطة',
  'شنو الفرق بين العطر الأصلي والتيستر؟',
  'شكد ثباتية البخور ولبان الذكر في متجركم؟',
  'شلون أصنع خلطة بخوري الخاصة بسعر 5000؟',
  'أفضل روتين واقعي لتكثيف الشعر ومنع التساقط',
  'شنو أجور ومدة التوصيل للمحافظات وباب البيت؟',
];

const INITIAL_GREETING: Message = {
  id: 'msg-init',
  role: 'assistant',
  content: `يا هلا ومية هلا بيك في **كوزمتك الملكة** 👑✨

أنا **مستشارك وخبيرك الذكي المباشر** في المتجر. تدلل من عيوني لأي استشارة تخص:
- 🌸 **العناية بالبشرة والشعر**: كورس وروتين مخصص لكل نوع بشرة بمنتجات أصلية 100%.
- 💎 **العطور الأصلية والتيستر**: نصائح الثباتية والفوحان واختيار العطر المناسب.
- 🏺 **البخور واللبان الملكي**: وخلطتنا الذهبية الخاصة بسعر **5,000 د.ع** فقط.
- 🚚 **الطلب والتوصيل السريع**: لكافة محافظات العراق لحد باب البيت مع الدفع عند الاستلام.

تفضل بسؤالك مباشرة وتدلل!`,
  timestamp: 'الآن',
};

/**
 * Instant client-side Iraqi Arabic fallback generator
 * Used if server fetch times out or network suffers a momentary glitch.
 */
function getClientFallbackAnswer(query: string = ''): string {
  const q = query.toLowerCase();

  if (q.includes('عطر') || q.includes('عطور') || q.includes('ثبات') || q.includes('فوحان') || q.includes('بارفيوم') || q.includes('تيستر') || q.includes('تستر')) {
    if (q.includes('تيستر') || q.includes('تستر')) {
      return `يا هلا بيك عيوني نورت كوزمتك الملكة 👑✨

بخصوص **عطور التيستر (Tester)**:
- **الزيت والتركيز**: أصلي 100% نفس الزيت العطري للعطر العادي وبنفس الثباتية والفوحان تماماً.
- **الفرق الوحيد**: يجي بكرتونة بيضاء أو تجريبية مخصصة للعرض وبدون كرتونة ملونة وسلوفان فاخر، ولهذا سعره يكون أوفر بهواي!
- **نصيحة الملكة**: إذا العطر لاستخدامك الشخصي، التيستر خيار ممتاز واقتصادي جداً. أما إذا كان هدية، فالنسخة المغلفة بالكرتونة الأصلية تكون أفخم.

تكدر تطلب أي عطر تريده من المتجر أو تراسلنا على الواتساب: **9647828956749** وتدلل من عيوني! 🌹`;
    }

    return `يا هلا بيك عيوني نورت كوزمتك الملكة 👑✨

بخصوص **العطور والثباتية والفوحان**:
- **أنواع التركيز**:
  1. **Parfum**: يدوم من 8 إلى 12 ساعة فوحان وثبات عالي جداً.
  2. **Eau de Parfum (EDP)**: ثباته ممتاز من 6 إلى 8 ساعات، وهو الأكثر طلباً.
  3. **Eau de Toilette (EDT)**: خفيف ومنعش يدوم من 3 إلى 5 ساعات.
- **طريقة التثبيت الأفضل**: رشي العطر على أماكن النبض (خلف الأذنين، المعصمين، والرقبة) وتكون البشرة مرطبة بمرطب خالي من العطور ليدوم وقت أطول!

متوفرة عندنا تشكيلة فاخرة من العطور الأصلية وعطور التيستر بأسعار تجنن. تكدر تطلب مباشرة عبر الواتساب: **9647828956749** وبخدمتك دائماً!`;
  }

  if (q.includes('بشرة') || q.includes('سيروم') || q.includes('حبوب') || q.includes('مسام') || q.includes('روتين') || q.includes('واقي') || q.includes('تفتيح') || q.includes('مرطب') || q.includes('غسول') || q.includes('كوري')) {
    return `تدلل عيوني من عيوني المركبة 👑✨

للحصول على بشرة صحية ونضرة، هذا **الروتين الأساسي المعتمد طبياً**:
1. **الغسول المناسب**: مرتين باليوم (غسول لطيف رغوي للبشرة الدهنية/المختلطة، وغسول كريمي للبشرة الجافة).
2. **سيروم علاجي**:
   - للحبوب والمسام والدهون: **النياسيناميد (Niacinamide)** أو **الساليسيليك أسيد**.
   - للنضارة والترطيب العميق: **الهيالورونيك أسيد (Hyaluronic Acid)** على بشرة ندية بالماء.
   - للتفتيح والآثار: **فيتامين C** صباحاً.
3. **الترطيب**: مرطب خفيف جل للبشرة الدهنية، أو مرطب غني بالسيراميد للبشرة الجافة.
4. **واقي الشمس (Sunscreen)**: الخطوة الأهم نهاراً لحماية البشرة من التصبغات والتجاعيد!

💡 **نصيحة أمانة**: أي روتين يحتاج التزام من **2 إلى 4 أسابيع** لتشوف فرق حقيقي ومستدام. 
كافة المنتجات الأصلية والكورية متوفرة بمتجرنا، وأي استفسار أو طلب تكدر تراسلنا واتساب: **9647828956749**!`;
  }

  if (q.includes('شعر') || q.includes('تساقط') || q.includes('تكثيف') || q.includes('فروة') || q.includes('روزماري') || q.includes('كيراتين')) {
    return `يا هلا بعيونك 🌸 بخصوص **علاج تساقط الشعر وتكثيفه**:

1. **تحفيز الفروة**: استخدام سيروم أو زيت الروزماري (إكليل الجبل) مع تدليك لطيف للفروة بأطراف الأصابع لمدة 4-5 دقائق لتنشيط الدورة الدموية.
2. **الشامبو الصحي**: اختار شامبو طبي خالي من السلفات القاسية للحفاظ على الزيوت الطبيعية للبصيلات.
3. **الترطيب والترميم**: ماسك ترطيب عميق أسبوعي لأطراف الشعر لحمايته من التقصف والهيشان.
4. **الصبر والالتزام**: دورة نمو الشعر تحتاج من **4 إلى 8 أسابيع** لملاحظة تراجع التساقط وبداية ظهور البيبي هير.

نوفر لك أفضل زيوت وسيرومات العناية بالشعر الأصلية 100% بمتجر كوزمتك الملكة مع توصيل سريع. تكدر تطلبها عبر الواتساب: **9647828956749**!`;
  }

  if (q.includes('بخور') || q.includes('لبان') || q.includes('مبسوس') || q.includes('عود') || q.includes('خلطة') || q.includes('5000')) {
    return `أهلاً وسهلاً بك في عالم الملكة الفاخر 👑✨

تشكيلة **البخور واللبان الملكي** عندنا مميزة جداً:
- **البخور الملكي والمبسوس**: ثباتية وفوحان بالمكان تدوم من 4 إلى 5 ساعات برائحة شرقية فاخرة ومريحة للأعصاب.
- **لبان الذكر (المسكي والورد)**: عماني فاخر مقروء عليه رقية شرعية، ثباتيته من 5 إلى 6 ساعات وينشر طاقة إيجابية وهدوء بالبيت.
- 🌟 **ميزة حصرية بمتجرنا**: "اصنع خلطة بخورك الخاصة" بسعر **5,000 د.ع فقط** بعلبة ذهبية فاخرة، تختار من بين أرقى خلطات العود والمسك واللبان!

تكدر تطلب خلطتك أو أي منتج بخور مباشرة من المتجر أو عبر الواتساب: **9647828956749** وتدلل من عيوني!`;
  }

  if (q.includes('توصيل') || q.includes('شحن') || q.includes('محافظات') || q.includes('بغداد') || q.includes('بصرة') || q.includes('شكد') || q.includes('سعر') || q.includes('طلب')) {
    return `يا هلا ومرحبا بيك عيوني 🚚✨

معلومات **التوصيل والطلب في كوزمتك الملكة**:
- **مقر المتجر**: العراق - البصرة، ونوصل لجميع محافظات العراق (بغداد، البصرة، أربيل، كربلاء، النجف وكافة المدن والمحافظات).
- **أجور التوصيل**:
  • مركز البصرة: **3,000 د.ع** فقط.
  • أقضية البصرة والمحافظات العراقية: **5,000 د.ع**.
  • **توصيل مجاني بالكامل**: لأي طلب بقيمة **50,000 د.ع فما فوق**!
- **المدة**: التوصيل سريع لباب بيتك خلال **24 إلى 48 ساعة**.
- **الدفع**: الدفع عند الاستلام مع إمكانية معاينة الطلب قبل الدفع.
- **للطلب المباشر والسريع عبر الواتساب**: **9647828956749**!`;
  }

  return `يا هلا ومية هلا بيك في **كوزمتك الملكة** 👑✨

تدلل عيوني، مستشارك الذكي بخدمتك دائماً لأي استفسار يخص:
- **العناية بالبشرة والشعر**: اختيار أفضل المنتجات الكورية والعالمية المناسبة لنوع بشرتك بدقة.
- **العطور الأصلية والتيستر**: نصائح الثباتية والفوحان واختيار العطر المناسب لذوقك.
- **البخور واللبان الملكي**: وخلطتنا الذهبية الخاصة بسعر 5,000 د.ع فقط.
- **التوصيل السريع**: لكافة محافظات العراق مع الدفع عند الاستلام.

تفضل بسؤالك مباشرة، أو تكدر تراسلنا على الواتساب للطلب المباشر: **9647828956749** وتدلل من عيوني! 🌹`;
}

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
      // 20-second client abort timeout controller to allow full AI response generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: validHistory,
          userMessage: text,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || getClientFallbackAnswer(text);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) =>
        prev.map((m): Message => (m.id === userMsgId ? { ...m, status: 'sent' } : m)).concat(assistantMsg)
      );
    } catch {
      // Smooth instant fallback without stopping the conversation
      const fallbackReply = getClientFallbackAnswer(text);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) =>
        prev.map((m): Message => (m.id === userMsgId ? { ...m, status: 'sent' } : m)).concat(assistantMsg)
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
                  href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent('مرحباً كوزمتك الملكة، أود استشارة مباشرة لطلب منتجات')}`}
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
