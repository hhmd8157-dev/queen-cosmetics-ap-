import fs from 'fs';
import path from 'path';

export interface TelegramConfig {
  botToken: string;
  chatIds: string[];
  enabled: boolean;
  lastSync?: string;
  botUsername?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'telegram_config.json');

const DEFAULT_TOKEN = '8730831848:AAHJ7xkm6CKTH1X-1afTNNbmL9f4nkru9t4'.trim();
const DEFAULT_CHAT_IDS = ['7355854532'.trim()];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getTelegramConfig(): TelegramConfig {
  ensureDataDir();
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const envChatId = process.env.TELEGRAM_CHAT_ID?.trim();

  const initialChatIds = envChatId
    ? [envChatId, ...DEFAULT_CHAT_IDS.filter((id) => id !== envChatId)]
    : [...DEFAULT_CHAT_IDS];

  let config: TelegramConfig = {
    botToken: envToken || DEFAULT_TOKEN,
    chatIds: initialChatIds,
    enabled: true,
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);
      const mergedChatIds = Array.from(
        new Set([
          ...(Array.isArray(parsed.chatIds) ? parsed.chatIds : []),
          ...initialChatIds,
        ])
      );
      
      const oldToken = '8886220024:AAFf0h1B703aCXgWpVwKnKS38vxdYPVCtU0';
      let resolvedToken = envToken || parsed.botToken || DEFAULT_TOKEN;
      if (!resolvedToken || resolvedToken === oldToken) {
        resolvedToken = DEFAULT_TOKEN;
      }

      config = {
        ...config,
        ...parsed,
        botToken: resolvedToken,
        chatIds: mergedChatIds,
      };
      saveTelegramConfig(config);
    } catch (e) {
      console.error('Failed to read telegram config:', e);
    }
  } else {
    saveTelegramConfig(config);
  }

  return config;
}

export function saveTelegramConfig(config: TelegramConfig) {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save telegram config:', err);
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatPrice(num: number): string {
  return (num || 0).toLocaleString('en-US');
}

export async function getBotMe(token?: string) {
  const activeToken = (token || getTelegramConfig().botToken).trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Network error' };
  }
}

export async function syncTelegramChats(): Promise<{
  ok: boolean;
  chatIds: string[];
  newChatsCount: number;
  botInfo?: any;
  error?: string;
}> {
  const config = getTelegramConfig();
  const token = config.botToken.trim();

  try {
    const botMe = await getBotMe(token);
    if (!botMe.ok) {
      return {
        ok: false,
        chatIds: config.chatIds,
        newChatsCount: 0,
        error: botMe.description || 'Invalid Telegram Bot Token',
      };
    }

    if (botMe.result?.username) {
      config.botUsername = botMe.result.username;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await res.json();

    if (!data.ok) {
      return {
        ok: false,
        chatIds: config.chatIds,
        newChatsCount: 0,
        botInfo: botMe.result,
        error: data.description || 'Failed to fetch updates from Telegram',
      };
    }

    const foundChats = new Set<string>(config.chatIds);
    let newCount = 0;

    if (Array.isArray(data.result)) {
      for (const update of data.result) {
        const chat =
          update.message?.chat ||
          update.channel_post?.chat ||
          update.my_chat_member?.chat ||
          update.callback_query?.message?.chat;

        if (chat && chat.id) {
          const chatIdStr = String(chat.id);
          if (!foundChats.has(chatIdStr)) {
            foundChats.add(chatIdStr);
            newCount++;
          }
        }
      }
    }

    config.chatIds = Array.from(foundChats);
    config.lastSync = new Date().toISOString();
    saveTelegramConfig(config);

    return {
      ok: true,
      chatIds: config.chatIds,
      newChatsCount: newCount,
      botInfo: botMe.result,
    };
  } catch (err: any) {
    console.error('Error syncing telegram chats:', err);
    return {
      ok: false,
      chatIds: config.chatIds,
      newChatsCount: 0,
      error: err?.message || 'Connection error',
    };
  }
}

export function formatOrderTelegramMessage(order: any): string {
  const itemsText = order.items
    .map(
      (item: any, idx: number) =>
        `  ${idx + 1}. <b>${escapeHtml(item.product.name)}</b>\n     الكمية: <b>${item.quantity}</b> | السعر: ${formatPrice(
          (item.product.price || 0) * item.quantity
        )} د.ع`
    )
    .join('\n\n');

  const timingText =
    order.deliveryTiming === 'today'
      ? 'اليوم (توصيل فوري/سريع ⚡)'
      : order.deliveryTiming === 'tomorrow'
      ? 'غداً'
      : 'خلال هذا الأسبوع';

  const mapText = order.location?.mapUrl
    ? `\n🗺️ <b>رابط الموقع الجغرافي (GPS):</b>\n<a href="${order.location.mapUrl}">${order.location.mapUrl}</a>`
    : '';

  const notesText = order.customer.notes
    ? `\n📝 <b>ملاحظات الزبون:</b> ${escapeHtml(order.customer.notes)}`
    : '';

  const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `👑 <b>طلب جديد في كوزمتك الملكة!</b> 🛍️
━━━━━━━━━━━━━━━━━━━━
🔖 <b>رقم التتبع:</b> <code>#${order.trackingCode}</code>
📅 <b>التاريخ:</b> ${dateStr}

👤 <b>اسم الزبون:</b> <b>${escapeHtml(order.customer.name)}</b>
📞 <b>رقم الهاتف:</b> <code>${escapeHtml(order.customer.phone)}</code>

📍 <b>العنوان والتوصيل:</b>
• المحافظة/المنطقة: <b>${escapeHtml(order.customer.governorate)}</b>
• العنوان التفصيلي: ${escapeHtml(order.customer.address)}${mapText}${notesText}

📦 <b>المنتجات المطلوبة والكميات:</b>
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 <b>المجموع الفرعي:</b> ${formatPrice(order.subtotal)} د.ع
🚚 <b>أجور التوصيل:</b> ${order.deliveryFee === 0 ? 'مجاني 🎉' : `${formatPrice(order.deliveryFee)} د.ع`}
${order.discountAmount ? `🏷️ <b>الخصم:</b> -${formatPrice(order.discountAmount)} د.ع\n` : ''}💵 <b>المبلغ الإجمالي الواصل:</b> <b>${formatPrice(order.total)} د.ع</b>
⏰ <b>الوقت المفضل:</b> ${timingText} ${order.customTimingText ? `(${escapeHtml(order.customTimingText)})` : ''}
━━━━━━━━━━━━━━━━━━━━
<i>تم إرسال هذا الإشعار تلقائياً من متجر كوزمتك الملكة</i> ✨`;
}

export async function sendTelegramNotification(order: any): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    console.log('[Telegram] Notifications are disabled in config.');
    return { success: false, sentCount: 0, failedCount: 0, errors: ['Disabled'] };
  }

  const token = config.botToken.trim();
  if (!token) {
    console.warn('[Telegram] No Bot Token configured.');
    return { success: false, sentCount: 0, failedCount: 0, errors: ['No Bot Token'] };
  }

  // If no chat IDs are saved, try to auto-sync from getUpdates once
  if (!config.chatIds || config.chatIds.length === 0) {
    try {
      await syncTelegramChats();
    } catch {}
  }

  const updatedConfig = getTelegramConfig();
  const recipients = [...updatedConfig.chatIds];

  if (recipients.length === 0) {
    console.warn('[Telegram] No chat IDs found to send order to. Father needs to start the bot.');
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: ['No subscribed chat IDs found. Please send /start to the Telegram Bot.'],
    };
  }

  const messageText = formatOrderTelegramMessage(order);
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const chatId of recipients) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        sentCount++;
        console.log(`[Telegram] Order ${order.trackingCode} sent successfully to chat ${chatId}`);
      } else {
        failedCount++;
        errors.push(`Chat ${chatId}: ${data.description || 'Failed'}`);
        console.warn(`[Telegram] Failed to send to chat ${chatId}:`, data.description);
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`Chat ${chatId}: ${err?.message || 'Network error'}`);
      console.error(`[Telegram] Error sending to chat ${chatId}:`, err);
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    errors,
  };
}

export async function sendTestTelegramMessage(targetChatId?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const config = getTelegramConfig();
  const token = config.botToken.trim();

  if (!token) {
    return { success: false, message: 'يرجى إدخال توكن البوت أولاً' };
  }

  let recipients = targetChatId ? [targetChatId] : [...config.chatIds];

  if (recipients.length === 0) {
    // Attempt sync
    const syncRes = await syncTelegramChats();
    if (syncRes.ok && syncRes.chatIds.length > 0) {
      recipients = syncRes.chatIds;
    }
  }

  if (recipients.length === 0) {
    return {
      success: false,
      message:
        'لم يتم العثور على أي محادثات مشتركة مع البوت حتى الآن. يرجى فتح البوت في التلجرام والضغط على زر Start أولاً ثم المحاولة مجدداً.',
    };
  }

  const testMsg = `🔔 <b>تجربة نظام إشعارات كوزمتك الملكة</b> ✨
━━━━━━━━━━━━━━━━━━━━
هذه رسالة اختبارية لتأكيد ربط المتجر ببوت التلجرام بنجاح!
✅ ستصلك كافة الطلبات الجديدة لحظياً فور تقديمها من الزبائن متضمنة:
1️⃣ اسم الزبون
2️⃣ رقم الهاتف
3️⃣ المنتجات والكميات
4️⃣ العنوان ورابط الموقع الجغرافي (GPS)
━━━━━━━━━━━━━━━━━━━━
⏰ <b>الوقت:</b> ${new Date().toLocaleTimeString('ar-IQ')}`;

  let sent = 0;
  const errors: string[] = [];

  for (const cid of recipients) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cid,
          text: testMsg,
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        sent++;
      } else {
        errors.push(`Chat ${cid}: ${data.description}`);
      }
    } catch (e: any) {
      errors.push(`Chat ${cid}: ${e.message}`);
    }
  }

  if (sent > 0) {
    return {
      success: true,
      message: `تم إرسال رسالة الاختبار بنجاح إلى ${sent} محادثة!`,
    };
  } else {
    return {
      success: false,
      message: `فشل الإرسال: ${errors.join(', ')}`,
    };
  }
}

export function formatChatMessageTelegramMessage(data: {
  customerName: string;
  orderId: string;
  text: string;
}): string {
  return `💬 <b>رسالة جديدة من زبون!</b>
👤 <b>الاسم:</b> ${escapeHtml(data.customerName)}
🆔 <b>رمز التتبع:</b> <code>#${data.orderId}</code>
✉️ <b>الرسالة:</b> ${escapeHtml(data.text)}`;
}

export async function sendChatMessageTelegramNotification(data: {
  customerName: string;
  orderId: string;
  text: string;
}): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { success: false, sentCount: 0, failedCount: 0, errors: ['Telegram notifications disabled'] };
  }

  const token = config.botToken.trim();
  if (!token) {
    return { success: false, sentCount: 0, failedCount: 0, errors: ['No Bot Token'] };
  }

  if (!config.chatIds || config.chatIds.length === 0) {
    try {
      await syncTelegramChats();
    } catch {}
  }

  const updatedConfig = getTelegramConfig();
  const recipients = [...updatedConfig.chatIds];

  if (recipients.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: ['No subscribed chat IDs found.'],
    };
  }

  const messageText = formatChatMessageTelegramMessage(data);
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const chatId of recipients) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      const resData = await res.json();
      if (resData.ok) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`Chat ${chatId}: ${resData.description || 'Failed'}`);
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`Chat ${chatId}: ${err?.message || 'Network error'}`);
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    errors,
  };
}

export function formatStockNotificationTelegramMessage(item: {
  productName: string;
  productBrand: string;
  productPrice: number;
  customerPhone: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
}): string {
  const dateStr = new Date(item.createdAt || Date.now()).toLocaleString('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `🔔 <b>طلب إشعار جديد: 'أخبرني عند التوفر'!</b> 📦
━━━━━━━━━━━━━━━━━━━━
زبون مهتم بمنتج نفدت كميته ويرغب بإشعاره عند توفره مجدداً:

🛍️ <b>المنتج المطلوب:</b> <b>${escapeHtml(item.productName)}</b>
🏷️ <b>الماركة:</b> ${escapeHtml(item.productBrand)}
💰 <b>السعر المقدر:</b> ${formatPrice(item.productPrice)} د.ع

👤 <b>اسم الزبون:</b> ${escapeHtml(item.customerName || 'زبون كوزمتك الملكة')}
📞 <b>رقم هاتف الزبون:</b> <code>${escapeHtml(item.customerPhone)}</code>
${item.notes ? `📝 <b>ملاحظة:</b> ${escapeHtml(item.notes)}\n` : ''}📅 <b>تاريخ الطلب:</b> ${dateStr}
━━━━━━━━━━━━━━━━━━━━
💡 <i>يمكنك الاتصال بالزبون عبر الهاتف أو الواتساب فور وصول شحنة جديدة من هذا المنتج!</i> ✨`;
}

export async function sendStockAlertTelegramNotification(requestItem: {
  productName: string;
  productBrand: string;
  productPrice: number;
  customerPhone: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
}): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const config = getTelegramConfig();
  if (!config.enabled) {
    return { success: false, sentCount: 0, failedCount: 0, errors: ['Telegram notifications disabled'] };
  }

  const token = config.botToken.trim();
  if (!token) {
    return { success: false, sentCount: 0, failedCount: 0, errors: ['No Bot Token'] };
  }

  if (!config.chatIds || config.chatIds.length === 0) {
    try {
      await syncTelegramChats();
    } catch {}
  }

  const updatedConfig = getTelegramConfig();
  const recipients = [...updatedConfig.chatIds];

  if (recipients.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: ['No subscribed chat IDs found.'],
    };
  }

  const messageText = formatStockNotificationTelegramMessage(requestItem);
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const chatId of recipients) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`Chat ${chatId}: ${data.description || 'Failed'}`);
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`Chat ${chatId}: ${err?.message || 'Network error'}`);
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    errors,
  };
}
