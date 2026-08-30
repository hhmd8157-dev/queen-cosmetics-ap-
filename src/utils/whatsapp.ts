import { CartItem, CustomerLocation, OrderCustomerDetails, Product } from '../types';
import { STORE_INFO, formatIQD } from '../data/products';

/**
 * Creates a direct WhatsApp checkout URL for a whole shopping cart order
 */
export function generateCartWhatsAppUrl(
  items: CartItem[],
  customer: OrderCustomerDetails,
  deliveryFee: number,
  discountCode?: string,
  discountAmount: number = 0,
  location?: CustomerLocation | null
): string {
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

  let message = `👑 *طلب جديد من متجر كوزمتك الملكة* 👑\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `👤 *معلومات الزبون والموقع:* \n`;
  message += `• *الاسم الكريم:* ${customer.name || 'غير محدد'}\n`;
  message += `• *رقم الهاتف:* ${customer.phone || 'غير محدد'}\n`;
  message += `• *المحافظة:* ${customer.governorate || 'البصرة'}\n`;
  if (customer.district) {
    message += `• *المنطقة / الحي:* ${customer.district}\n`;
  }
  if (customer.nearestLandmark) {
    message += `• *أقرب نقطة دالة:* ${customer.nearestLandmark}\n`;
  }
  if (customer.houseDetails) {
    message += `• *رقم البيت / تفاصيل:* ${customer.houseDetails}\n`;
  }
  if (customer.address) {
    message += `• *العنوان الإضافي:* ${customer.address}\n`;
  }
  if (location) {
    message += `🗺️ *رابط موقع المندوب المباشر (Google Maps):* ${location.mapUrl}\n`;
    message += `📍 *الإحداثيات الدقيقة:* ${location.latitude}, ${location.longitude}\n`;
  }
  if (customer.notes) {
    message += `• *ملاحظات خاصة:* ${customer.notes}\n`;
  }

  message += `\n🛍️ *تفاصيل الطلبية (${items.reduce((s, i) => s + i.quantity, 0)} قطع):*\n`;
  items.forEach((item, index) => {
    const itemTotal = item.product.price * item.quantity;
    message += `${index + 1}. *${item.product.name}*\n`;
    message += `   - الماركة: ${item.product.brand}\n`;
    if (item.product.volumeOrWeight) {
      message += `   - الحجم/الوزن: ${item.product.volumeOrWeight}\n`;
    }
    message += `   - السعر: ${formatIQD(item.product.price)} × ${item.quantity} = *${formatIQD(itemTotal)}*\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *المجموع الفرعي:* ${formatIQD(subtotal)}\n`;
  if (discountAmount > 0) {
    message += `🏷️ *الخصم (${discountCode || 'كوبون'}):* -${formatIQD(discountAmount)}\n`;
  }
  message += `🚚 *أجور التوصيل:* ${deliveryFee === 0 ? 'مجاني (عرض خاص)' : formatIQD(deliveryFee)}\n`;
  message += `⭐️ *المجموع النهائي الواجب دفعه:* *${formatIQD(total)}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `يرجى تأكيد استلام الطلب وتزويدي بموعد التوصيل التقريبي. شكراً لكم! ✨`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${STORE_INFO.whatsappNumber}?text=${encoded}`;
}

/**
 * Creates a direct 1-click WhatsApp order URL for an individual product
 */
export function generateSingleProductWhatsAppUrl(
  product: Product,
  quantity: number = 1,
  customerName?: string,
  city?: string
): string {
  const total = product.price * quantity;

  let message = `👑 *استفسار / طلب مباشر من متجر كوزمتك الملكة* 👑\n\n`;
  message += `مرحباً، أود طلب هذا المنتج مباشرة:\n`;
  message += `✨ *اسم المنتج:* ${product.name}\n`;
  message += `🏷️ *الماركة:* ${product.brand}\n`;
  if (product.volumeOrWeight) {
    message += `📦 *الحجم:* ${product.volumeOrWeight}\n`;
  }
  message += `🔢 *الكمية المطلوبة:* ${quantity}\n`;
  message += `💵 *السعر الإجمالي:* *${formatIQD(total)}*\n`;

  if (customerName) {
    message += `👤 *الاسم:* ${customerName}\n`;
  }
  if (city) {
    message += `📍 *المحافظة / المدينة:* ${city}\n`;
  }

  message += `\nيرجى تأكيد التوفر وترتيب التوصيل. شكراً جزيلاً! 🌹`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${STORE_INFO.whatsappNumber}?text=${encoded}`;
}
