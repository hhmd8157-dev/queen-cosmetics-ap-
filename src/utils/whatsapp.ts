import { CartItem, CustomerLocation, OrderCustomerDetails, Product, Order } from '../types';
import { formatIQD } from '../data/products';

// Official WhatsApp contact number for Queen Cosmetics
export const STORE_WHATSAPP_NUMBER = '9647828956749';
export const STORE_WHATSAPP_DISPLAY = '0782 895 6749';

/**
 * Creates a direct WhatsApp checkout URL for a whole shopping cart order
 * Formats full order details: customer name, phone, governorate, address, items, subtotal, delivery fee, and total.
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

  message += `👤 *معلومات الزبون والتوصيل:*\n`;
  message += `• *اسم الزبون:* ${customer.name?.trim() || '[يرجى كتابة اسمك الكريم]'}\n`;
  message += `• *رقم الهاتف للتواصل:* ${customer.phone?.trim() || '[يرجى كتابة رقم الهاتف]'}\n`;
  message += `• *المحافظة:* ${customer.governorate?.trim() || 'البصرة / العراق'}\n`;
  if (customer.district?.trim()) {
    message += `• *المنطقة / الحي:* ${customer.district.trim()}\n`;
  }
  if (customer.nearestLandmark?.trim()) {
    message += `• *أقرب نقطة دالة:* ${customer.nearestLandmark.trim()}\n`;
  }
  if (customer.houseDetails?.trim()) {
    message += `• *رقم البيت / تفاصيل الإقامة:* ${customer.houseDetails.trim()}\n`;
  }
  if (customer.address?.trim() && !customer.address.includes('موقع GPS المباشر')) {
    message += `• *العنوان بالتفصيل:* ${customer.address.trim()}\n`;
  }
  if (location?.mapUrl) {
    message += `📍 *موقع GPS المباشر (خرائط Google):* ${location.mapUrl}\n`;
  }
  if (customer.notes?.trim()) {
    message += `📝 *ملاحظات خاصة:* ${customer.notes.trim()}\n`;
  }

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  message += `\n🛍️ *تفاصيل الطلبية (${totalQuantity} قطعة):*\n`;
  items.forEach((item, index) => {
    const itemTotal = item.product.price * item.quantity;
    message += `${index + 1}. *${item.product.name}*\n`;
    message += `   - الماركة: ${item.product.brand}\n`;
    if (item.product.volumeOrWeight) {
      message += `   - الحجم/السعة: ${item.product.volumeOrWeight}\n`;
    }
    message += `   - الكمية: ${item.quantity}\n`;
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
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encoded}`;
}

/**
 * Creates a direct WhatsApp confirmation URL for an already placed Order
 */
export function generateOrderConfirmationWhatsAppUrl(order: Order): string {
  let message = `👑 *تأكيد طلب جديد - كوزمتك الملكة* 👑\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔖 *رمز التتبع:* #${order.trackingCode}\n\n`;

  const custName = order.customer?.name || (order as any).customerName || '';
  const custPhone = order.customer?.phone || (order as any).phone || '';
  const custAddr = order.customer?.address || (order as any).address || '';

  message += `👤 *معلومات الزبون والمستلم:*\n`;
  message += `• *اسم الزبون:* ${custName || 'زبون المتجر'}\n`;
  message += `• *رقم الهاتف:* ${custPhone || 'غير محدد'}\n`;
  if (custAddr) {
    message += `• *العنوان:* ${custAddr}\n`;
  }
  if (order.location?.mapUrl) {
    message += `📍 *موقع GPS:* ${order.location.mapUrl}\n`;
  }
  if (order.deliveryTiming) {
    message += `⏰ *وقت التوصيل المفضل:* ${order.deliveryTiming}\n`;
  }

  message += `\n🛍️ *المنتجات المطلوبة:* \n`;
  (order.items || []).forEach((item: any, idx: number) => {
    const pName = item.product?.name || item.name || 'منتج كوزمتك الملكة';
    const pBrand = item.product?.brand || item.brand || '';
    const pPrice = item.product?.price || item.price || 0;
    const pQty = item.quantity || 1;
    message += `${idx + 1}. *${pName}* ${pBrand ? `(${pBrand})` : ''} - الكمية: ${pQty} (${formatIQD(pPrice * pQty)})\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *المجموع النهائي:* *${formatIQD(order.total || (order as any).totalPrice || 0)}*\n`;
  message += `✨ يرجى تأكيد استلام هذا الطلب والبدء بالتجهيز. شكراً جزيلاً! 🌹`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encoded}`;
}

/**
 * Creates a direct WhatsApp checkout URL for a single product
 * Formats: Product name, brand, volume, quantity, total price, customer name, and address.
 */
export function generateSingleProductWhatsAppUrl(
  product: Product,
  quantity: number = 1,
  customerName?: string,
  cityOrAddress?: string
): string {
  // If customer details are not provided directly, attempt to read stored details from localStorage
  let name = customerName?.trim();
  let address = cityOrAddress?.trim();
  let phone = '';

  if (typeof window !== 'undefined') {
    try {
      if (!name || !address) {
        const savedData = localStorage.getItem('queen_customer_info') || localStorage.getItem('active_order');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const cust = parsed.customer || parsed;
          if (!name && (cust.name || cust.customerName)) {
            name = (cust.name || cust.customerName).trim();
          }
          if (!address) {
            const fullAddr = [cust.governorate, cust.district, cust.nearestLandmark, cust.address]
              .filter(Boolean)
              .join(' - ');
            if (fullAddr) address = fullAddr.trim();
          }
          if (cust.phone || cust.customerPhone) {
            phone = (cust.phone || cust.customerPhone).trim();
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  const total = product.price * quantity;

  let message = `👑 *طلب مباشر من متجر كوزمتك الملكة* 👑\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `مرحباً، أود طلب وتأكيد هذا المنتج مباشرة:\n\n`;

  message += `🛍️ *تفاصيل المنتج:* \n`;
  message += `• *اسم المنتج:* ${product.name}\n`;
  message += `• *الماركة:* ${product.brand}\n`;
  if (product.volumeOrWeight) {
    message += `• *الحجم / السعة:* ${product.volumeOrWeight}\n`;
  }
  message += `• *الكمية المطلوبة:* ${quantity}\n`;
  message += `• *سعر المفرد:* ${formatIQD(product.price)}\n`;
  message += `• *السعر الإجمالي:* *${formatIQD(total)}*\n\n`;

  message += `👤 *معلومات الزبون والتوصيل:*\n`;
  message += `• *اسم الزبون:* ${name || '[يرجى كتابة اسمك الكريم]'}\n`;
  message += `• *رقم الهاتف للتواصل:* ${phone || '[يرجى كتابة رقم الهاتف]'}\n`;
  message += `• *المحافظة والعنوان:* ${address || '[يرجى كتابة المحافظة والمنطقة / أقرب نقطة دالة]'}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🚚 أرجو تأكيد توفر المنتج وموعد التوصيل. شكراً جزيلاً! 🌹`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encoded}`;
}

