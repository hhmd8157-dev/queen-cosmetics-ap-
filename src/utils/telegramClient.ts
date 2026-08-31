// Client-side direct Telegram notification helper for Vercel / Production deployment robustness
const DEFAULT_BOT_TOKEN = '8730831848:AAHJ7xkm6CKTH1X-1afTNNbmL9f4nkru9t4';
const DEFAULT_CHAT_ID = '7355854532';

export async function sendTelegramDirectClientSide(text: string, botToken = DEFAULT_BOT_TOKEN, chatId = DEFAULT_CHAT_ID): Promise<boolean> {
  try {
    const token = botToken.trim();
    const targetChat = chatId.trim() || DEFAULT_CHAT_ID;
    
    if (!token) {
      console.warn('[Telegram Client] No bot token provided');
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChat,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      console.log('[Telegram Client] Notification sent successfully');
      return true;
    } else {
      console.warn('[Telegram Client] Telegram API rejected message:', data.description);
      return false;
    }
  } catch (err) {
    console.error('[Telegram Client] Network error sending notification:', err);
    return false;
  }
}

export function formatOrderMessageForClient(order: any): string {
  const itemsText = (order.items || [])
    .map(
      (item: any, idx: number) =>
        `  ${idx + 1}. <b>${item.product?.name || 'منتج'}</b>\n     الكمية: <b>${item.quantity}</b> | السعر: ${(
          (item.product?.price || 0) * item.quantity
        ).toLocaleString('en-US')} د.ع`
    )
    .join('\n\n');

  return `👑 <b>طلب جديد في كوزمتك الملكة! (مباشر عبر المتصفح)</b> 🛍️
━━━━━━━━━━━━━━━━━━━━
🔖 <b>رقم التتبع:</b> <code>#${order.trackingCode}</code>
👤 <b>اسم الزبون:</b> <b>${order.customer?.name}</b>
📞 <b>رقم الهاتف:</b> <code>${order.customer?.phone}</code>
📍 <b>العنوان:</b> ${order.customer?.governorate} - ${order.customer?.address}

📦 <b>المنتجات:</b>
${itemsText}
━━━━━━━━━━━━━━━━━━━━
💵 <b>المبلغ الإجمالي:</b> <b>${(order.total || 0).toLocaleString('en-US')} د.ع</b>
<i>تم إرسال هذا الإشعار من زائر عبر الموقع المباشر</i> ✨`;
}
