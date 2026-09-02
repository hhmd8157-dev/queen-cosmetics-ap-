import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CartSpendChart } from './CartSpendChart';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  ArrowRight,
  Tag,
  CheckCircle,
  AlertCircle,
  LocateFixed,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, CustomerLocation, OrderCustomerDetails, Order } from '../types';
import { GOVERNORATES, STORE_INFO, formatIQD } from '../data/products';
import { generateCartWhatsAppUrl } from '../utils/whatsapp';
import { getProductImageUrl } from '../utils/image';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import { broadcastNewOrderLocally } from '../utils/alerts';
import { saveOrderPermanently } from '../services/ordersFirestoreService';
import { sendTelegramDirectClientSide, formatOrderMessageForClient } from '../utils/telegramClient';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onExplore: () => void;
  onOrderPlaced: (trackingCode: string, orderData?: any) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onExplore,
  onOrderPlaced,
}) => {
  const [customer, setCustomer] = useState<OrderCustomerDetails>({
    name: '',
    phone: '',
    governorate: 'العراق',
    address: '',
    notes: '',
  });

  const [deliveryTiming, setDeliveryTiming] = useState<'today' | 'tomorrow' | 'this_week' | 'custom'>('today');
  const [customTimingText, setCustomTimingText] = useState<string>('');

  // GPS Location state
  const [location, setLocation] = useState<CustomerLocation | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState<boolean>(false);

  const handleMapConfirm = (
    loc: CustomerLocation,
    backup: { district: string; nearestLandmark: string; houseDetails: string }
  ) => {
    setLocation(loc);
    const addrParts = [backup.district, backup.nearestLandmark, backup.houseDetails].filter(Boolean).join(' - ');
    const finalAddr = addrParts ? `${addrParts} (${loc.mapUrl})` : `موقع GPS المباشر (${loc.mapUrl})`;
    setLocationAddress(finalAddr);
    setCustomer((prev) => ({
      ...prev,
      district: backup.district,
      nearestLandmark: backup.nearestLandmark,
      houseDetails: backup.houseDetails,
      address: finalAddr,
    }));
  };

  // Coupon state
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; isPercent: boolean } | null>(null);
  const [couponError, setCouponError] = useState<string>('');

  // Form Validation & Submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Subtotal calculation
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Delivery fee (Flat 3000 IQD, free if >= threshold)
  const isFreeDelivery = subtotal >= STORE_INFO.freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : STORE_INFO.deliveryBasraCity;

  // Coupon discount calculation
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.isPercent) {
      discountAmount = Math.round((subtotal * appliedCoupon.discount) / 100);
    } else {
      discountAmount = appliedCoupon.discount;
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

  // Handle GPS location retrieval
  const handleGetLocation = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع الجغرافي تلقائياً');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        const locObj: CustomerLocation = {
          latitude: lat,
          longitude: lng,
          accuracy,
          mapUrl,
        };

        setLocation(locObj);
        setIsLocating(false);

        let readableAddr = `موقع GPS المباشر: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              readableAddr = data.display_name;
            }
          }
        } catch (e) {
          console.warn('Reverse geocode fetch skipped:', e);
        }

        setLocationAddress(readableAddr);
        setCustomer((prev) => ({
          ...prev,
          address: `${readableAddr} (${mapUrl})`,
        }));
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError('يرجى إتاحة صلاحية الموقع في المتصفح لتحديده بضغطة واحدة.');
        } else {
          setLocationError('تعذر التقاط الموقع بدقة، يمكنك فتح الخريطة لتحديد موقعك.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleApplyCoupon = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCouponError('');
    const cleanCode = couponCode.trim().toUpperCase();

    if (!cleanCode) return;

    if (cleanCode === 'QUEEN10' || cleanCode === 'ملكة10') {
      setAppliedCoupon({ code: cleanCode, discount: 10, isPercent: true });
    } else if (cleanCode === 'CROWN' || cleanCode === 'تاج') {
      setAppliedCoupon({ code: cleanCode, discount: 3000, isPercent: false });
    } else {
      setCouponError('رمز الكوبون غير صالح أو منتهي الصلاحية');
    }
  };

  const handleRemoveCoupon = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  async function sendEmailOrderNotification(orderDetails: { 
    name: string; 
    phone: string; 
    items: string; 
    address?: string; 
    governorate?: string;
    district?: string;
    nearestLandmark?: string;
    houseDetails?: string;
    deliveryTiming?: string;
    notes?: string;
    total?: string | number; 
    trackingCode?: string;
  }) {
    // 1. Save to localStorage
    try {
      const existingOrders = JSON.parse(localStorage.getItem('cosmetic_local_orders') || '[]');
      const newOrderRecord = {
        ...orderDetails,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cosmetic_local_orders', JSON.stringify([newOrderRecord, ...existingOrders]));
    } catch (e) {
      console.error('Failed to save order to localStorage:', e);
    }

    // 2. Send immediate POST request to our robust backend queue for owner email: alaaalrubaie38@gmail.com
    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #d4af37;">🚨 طلب جديد - كوزمتك الملكة</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">رمز الطلب</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.trackingCode || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">اسم الزبون</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.name || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">رقم الهاتف</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.phone || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">المحافظة والمنطقة</th><td style="padding: 10px; border: 1px solid #ddd;">${`${orderDetails.governorate || ''} ${orderDetails.district ? '- ' + orderDetails.district : ''}`.trim() || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">العنوان التفصيلي</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.address || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">أقرب نقطة دالة</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.nearestLandmark || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">تفاصيل البيت</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.houseDetails || 'غير محدد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">تفاصيل المنتجات</th><td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${orderDetails.items || 'لا توجد منتجات'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">المبلغ الإجمالي</th><td style="padding: 10px; border: 1px solid #ddd;">${typeof orderDetails.total === 'number' ? `${orderDetails.total.toLocaleString()} د.ع` : (orderDetails.total || '0 د.ع')}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">توقيت التوصيل</th><td style="padding: 10px; border: 1px solid #ddd;">${orderDetails.deliveryTiming || 'عادي'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">ملاحظات إضافية</th><td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${orderDetails.notes || 'لا يوجد'}</td></tr>
          <tr><th style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">تاريخ الطلب</th><td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}</td></tr>
        </table>
      </div>
    `;

    try {
      // We will automatically retry this fetch on the client if it fails due to network issues
      const sendToBackend = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch("/api/send-email", {
              method: "POST",
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: "🚨 طلب جديد - كوزمتك الملكة",
                html: emailHtml
              })
            });
            if (res.ok) return; // Success!
          } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
          }
        }
      };
      
      sendToBackend().catch(err => {
        console.warn("Client background email notification error:", err);
      });
    } catch (err) {
      console.warn("Background email notification error:", err);
    }
  }

  // Direct In-App Checkout with multi-layer persistence (Firestore + LocalStorage + Backend API)
  const handleDirectCheckout = async (e?: React.MouseEvent, isWhatsApp = false) => {
    e?.preventDefault();
    e?.stopPropagation();
    setFormError('');

    if (!customer.name.trim()) {
      setFormError('يرجى إدخال اسم المستلم لاستلام الطلب');
      return;
    }

    if (!customer.phone.trim() || customer.phone.length < 8) {
      setFormError('يرجى إدخال رقم هاتف صحيح للتواصل والتوصيل');
      return;
    }

    let finalAddress = customer.address.trim();
    if (!finalAddress) {
      if (location?.mapUrl) {
        finalAddress = `موقع GPS المباشر: ${location.mapUrl}`;
      } else {
        finalAddress = 'العراق - موقع GPS مباشر (سيتم التواصل للتأكيد)';
      }
    }

    setIsSubmitting(true);

    // 1. Prepare reliable order object client-side immediately
    const localTrackingCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const localOrderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    let confirmedOrder: Order = {
      id: localOrderId,
      trackingCode: localTrackingCode,
      items: [...cartItems],
      customer: {
        ...customer,
        governorate: 'العراق',
        address: finalAddress,
      },
      subtotal,
      deliveryFee,
      discountAmount,
      couponCode: appliedCoupon?.code,
      total: finalTotal,
      deliveryTiming,
      customTimingText,
      location,
      status: 'received',
      createdAt: new Date().toISOString(),
      statusUpdatedAt: new Date().toISOString(),
      driverNotes: isWhatsApp ? 'طلب مرسل عبر واتساب 💬' : '',
    };

    try {
      const payload = {
        items: cartItems,
        customer: {
          ...customer,
          governorate: 'العراق',
          address: finalAddress,
        },
        subtotal,
        deliveryFee,
        discountAmount,
        couponCode: appliedCoupon?.code,
        total: finalTotal,
        deliveryTiming,
        customTimingText,
        location,
      };

      // Try Backend API safely without breaking if offline, static hosting, or non-JSON response
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const text = await res.text();
          if (text && text.trim().length > 0) {
            try {
              const data = JSON.parse(text);
              if (data && data.order) {
                confirmedOrder = data.order;
              }
            } catch (jsonErr) {
              console.warn('Backend response was not JSON:', jsonErr);
            }
          }
        }
      } catch (apiErr) {
        console.warn('Backend server /api/orders unreachable, proceeding with client cloud/local storage:', apiErr);
      }

      // 2. Permanently save across Firestore, unified LocalStorage, and broadcast channels
      await saveOrderPermanently(confirmedOrder);

      // Direct client-side Telegram dispatch as robust production backup for Vercel/Static hosting
      sendTelegramDirectClientSide(formatOrderMessageForClient(confirmedOrder)).catch((tgErr) => {
        console.warn('Direct telegram client send notice:', tgErr);
      });

      // 3. Send email notification in background (non-blocking)
      try {
        const itemsSummary = (Array.isArray(cartItems) ? cartItems : []).map((i) => `• ${i.product.name} (عدد: ${i.quantity} - السعر: ${formatIQD(i.product.price)})`).join('\n');
        sendEmailOrderNotification({
          name: customer.name,
          phone: customer.phone,
          governorate: 'العراق',
          address: finalAddress,
          deliveryTiming: customTimingText ? `${deliveryTiming} (${customTimingText})` : deliveryTiming,
          notes: customer.notes,
          items: itemsSummary,
          total: formatIQD(finalTotal),
          trackingCode: confirmedOrder.trackingCode,
        }).catch((emailErr) => {
          console.warn('FormSubmit email notification notice:', emailErr);
        });
      } catch (emailErr) {
        console.warn('Email notification dispatch notice:', emailErr);
      }

      // 4. Celebratory Confetti!
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      // 5. If WhatsApp was requested, launch WhatsApp
      if (isWhatsApp) {
        const whatsappUrl = generateCartWhatsAppUrl(
          cartItems,
          customer,
          deliveryFee,
          appliedCoupon?.code,
          discountAmount,
          location
        );
        window.open(whatsappUrl, '_blank');
      }

      // 6. Clear cart and close drawer
      onClearCart();
      onClose();

      // 7. Transition to "تم استلام طلبك بنجاح" tracking screen!
      onOrderPlaced(confirmedOrder.trackingCode, confirmedOrder);
    } catch (err: any) {
      console.error('Checkout notice (saving to guaranteed local storage):', err);
      // Guarantee order is never lost even under extreme conditions
      try {
        await saveOrderPermanently(confirmedOrder);
        if (isWhatsApp) {
          const whatsappUrl = generateCartWhatsAppUrl(
            cartItems,
            customer,
            deliveryFee,
            appliedCoupon?.code,
            discountAmount,
            location
          );
          window.open(whatsappUrl, '_blank');
        }
        onClearCart();
        onClose();
        onOrderPlaced(confirmedOrder.trackingCode, confirmedOrder);
      } catch (fallbackErr) {
        setFormError('حدث خطأ غير متوقع. يرجى إرسال الطلب عبر واتساب للتأكيد الفوري.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountNeededForFreeShipping = Math.max(0, STORE_INFO.freeDeliveryThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / STORE_INFO.freeDeliveryThreshold) * 100);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="w-full max-w-lg bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] h-full shadow-2xl flex flex-col justify-between overflow-hidden border-r border-[#EAEAEA] dark:border-[#27272A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:px-6 border-b border-[#EAEAEA] dark:border-[#27272A] bg-[#1A1A1A] dark:bg-[#0D0D10] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#FFE58F]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">تثبيت الطلب المباشر</h2>
              <p className="text-[11px] text-[#A1A1AA]">دفع عند الاستلام مع تتبع فوري للشحنة</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClearCart(); }}
                className="text-xs text-[#A1A1AA] hover:text-rose-400 cursor-pointer transition-colors"
                title="تفريغ السلة"
              >
                مسح الكل
              </button>
            )}

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
              className="p-1.5 text-[#A1A1AA] hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Free Shipping Progress Indicator */}
        {cartItems.length > 0 && (
          <div className="bg-[#FAFAFA] dark:bg-[#1A1A20] px-4 py-2.5 border-b border-[#EAEAEA] dark:border-[#27272A]">
            <div className="flex items-center justify-between text-xs text-[#666666] dark:text-[#A1A1AA] mb-1.5">
              <span className="flex items-center gap-1.5 font-medium">
                <Truck className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>الشحن والتوصيل</span>
              </span>
              {isFreeDelivery ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#C5A059]" />
                  شحن مجاني متاح لطلبك! 🎉
                </span>
              ) : (
                <span>
                  أضف <strong className="text-[#1A1A1A] dark:text-white">{formatIQD(amountNeededForFreeShipping)}</strong> للشحن المجاني
                </span>
              )}
            </div>
            <div className="w-full bg-[#EAEAEA] dark:bg-[#2A2A33] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] h-full rounded-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Items & Form Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-5">
          {cartItems.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-[#FAFAFA] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#27272A] rounded-full flex items-center justify-center mx-auto text-[#999999]">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1A1A1A] dark:text-white text-base">سلة التسوق فارغة</h3>
                <p className="text-xs text-[#999999] dark:text-[#A1A1AA] max-w-xs mx-auto">
                  لم تقم بإضافة أي منتج بعد. تصفح المنتجات واختر ما يناسبك!
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onExplore();
                }}
                className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black font-bold text-xs px-5 py-2.5 rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>ابدأ التسوق</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Cart Items List */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs text-[#666666] dark:text-[#A1A1AA] flex items-center gap-1.5">
                  <span>المنتجات المحددة ({(Array.isArray(cartItems) ? cartItems.reduce((acc, i) => acc + (i?.quantity || 1), 0) : 0)})</span>
                </h3>

                <div className="divide-y divide-[#EAEAEA] dark:divide-[#27272A] border border-[#EAEAEA] dark:border-[#27272A] rounded-xl overflow-hidden bg-white dark:bg-[#18181C] shadow-2xs">
                  {Array.isArray(cartItems) && cartItems.map((item) => (
                    <div key={item.product.id} className="p-3 flex gap-3 items-center">
                      {item.product.image ? (
                        <img
                          src={getProductImageUrl(item.product)}
                          alt={item.product.name}
                          className="w-14 h-14 object-contain rounded-lg border border-[#EAEAEA] dark:border-[#27272A] shrink-0 bg-white"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#F8F8F8] dark:bg-[#202026] border border-[#EAEAEA] dark:border-[#27272A] shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-[#1A1A1A] dark:text-white truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-[#C5A059] dark:text-[#FFE58F] font-bold mt-0.5">
                          {formatIQD(item.product.price)}
                        </p>

                        {/* Quantity Controller */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-[#EAEAEA] dark:border-[#2E2E35] rounded-md bg-[#FAFAFA] dark:bg-[#1E1E24]">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1 hover:bg-[#EAEAEA] dark:hover:bg-[#2E2E38] text-[#666666] dark:text-[#A1A1AA] transition-colors cursor-pointer"
                              title="تقليل"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-[#1A1A1A] dark:text-white min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-[#EAEAEA] dark:hover:bg-[#2E2E38] text-[#666666] dark:text-[#A1A1AA] transition-colors cursor-pointer"
                              title="زيادة"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-[#999999] hover:text-rose-500 p-1 transition-colors cursor-pointer mr-auto"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* D3 Purchase Budget Distribution Pie Chart */}
              <CartSpendChart cartItems={cartItems} />

              {/* Coupon Code Section */}
              <div className="bg-[#FAFAFA] dark:bg-[#1A1A20] p-3 rounded-xl border border-[#EAEAEA] dark:border-[#27272A] space-y-2">
                <label className="text-xs font-medium text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>كوبون الخصم:</span>
                </label>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-lg text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      تم تطبيق الكوبون ({appliedCoupon.code})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveCoupon(e)}
                      className="text-[#999999] dark:text-[#A1A1AA] hover:text-rose-600 text-xs font-medium underline cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="أدخل الكوبون (مثال: QUEEN10)..."
                      className="flex-1 bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3 py-2 text-xs outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleApplyCoupon(e)}
                      className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      تطبيق
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {couponError}
                  </p>
                )}
              </div>

              {/* Customer Delivery Details Section - Simplified Flow */}
              <div className="bg-[#FAFAFA] dark:bg-[#1A1A20] p-4 rounded-xl border border-[#EAEAEA] dark:border-[#27272A] space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-[#27272A] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center font-bold">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1A1A1A] dark:text-white">
                        بيانات المستلم وتحديد الموقع المباشر 🛵
                      </h4>
                      <p className="text-[10px] text-[#888888]">إدخال سريع بدون تعقيد</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    توصيل سريع ⚡
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* 1. Customer Name */}
                  <div>
                    <label className="block text-[#666666] dark:text-[#A1A1AA] font-bold mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>اسم المستلم: <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="الاسم الكامل المطلوب لاستلام الطلب (مثال: مريم علي)..."
                      className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3.5 py-2.5 text-xs outline-hidden font-medium"
                    />
                  </div>

                  {/* 2. Phone Number */}
                  <div>
                    <label className="block text-[#666666] dark:text-[#A1A1AA] font-bold mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>رقم الهاتف: <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="078xxxxxxxx"
                      dir="ltr"
                      className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3.5 py-2.5 text-xs text-right outline-hidden font-medium"
                    />
                  </div>

                  {/* 3. Prominent Auto GPS Location Button */}
                  <div>
                    <label className="block text-[#666666] dark:text-[#A1A1AA] font-bold mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <LocateFixed className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>موقع التوصيل عبر GPS:</span>
                      </span>
                      <span className="text-[10px] text-[#888888] font-normal">تحديد بضغطة واحدة</span>
                    </label>

                    {location ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div>
                              <p className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                                تم تحديد موقعك الحالي بنجاح! 📍
                              </p>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 line-clamp-1">
                                {locationAddress || 'موقع GPS المباشر للزبون'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGetLocation(e); }}
                              disabled={isLocating}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-[11px] font-semibold cursor-pointer"
                            >
                              تحديث
                            </button>
                            <a
                              href={location.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-[#1A1A1A] hover:bg-black text-white rounded-lg transition-colors"
                              title="معاينة خريطة Google"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-800/60 pt-1.5 flex items-center justify-between" dir="ltr">
                          <span>Lat: {location.latitude}, Lng: {location.longitude}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMapPickerOpen(true); }}
                            className="text-[10px] underline text-emerald-800 dark:text-emerald-300 hover:text-black font-sans cursor-pointer"
                          >
                            فتح الخريطة للتعديل 🗺️
                          </button>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGetLocation(e); }}
                          disabled={isLocating}
                          className="w-full bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#C5A059] hover:from-[#B38F4D] hover:to-[#B38F4D] text-black font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
                        >
                          {isLocating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                              <span>جاري التقاط إحداثيات GPS تلقائياً...</span>
                            </>
                          ) : (
                            <>
                              <LocateFixed className="w-4 h-4 text-black animate-pulse" />
                              <span>📍 تحديد موقعي الحالي تلقائياً (بضغطة واحدة)</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMapPickerOpen(true); }}
                          className="w-full text-center text-[11px] text-[#666666] dark:text-[#A1A1AA] hover:text-[#C5A059] underline cursor-pointer py-1"
                        >
                          أو فتح الخريطة وسحب الدبوس يدوياً 🗺️
                        </button>
                      </div>
                    )}

                    {locationError && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>{locationError}</span>
                      </p>
                    )}
                  </div>

                  {/* 4. Delivery Timing Options - "متى تريد استلام الطلب؟" */}
                  <div className="pt-2 border-t border-[#EAEAEA] dark:border-[#27272A]">
                    <label className="block text-[#666666] dark:text-[#A1A1AA] font-bold mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>متى تريد استلام الطلب؟ <span className="text-rose-500">*</span></span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                      {[
                        { id: 'today', label: 'اليوم ⚡' },
                        { id: 'tomorrow', label: 'غداً 📦' },
                        { id: 'this_week', label: 'خلال الأسبوع 📅' },
                        { id: 'custom', label: 'موعد مخصص ⏱️' },
                      ].map((timing) => (
                        <button
                          key={timing.id}
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeliveryTiming(timing.id as any); }}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                            deliveryTiming === timing.id
                              ? 'bg-[#1A1A1A] dark:bg-[#C5A059] text-[#FFE58F] dark:text-black border-[#1A1A1A] dark:border-[#C5A059] shadow-xs font-bold'
                              : 'bg-white dark:bg-[#141418] text-[#666666] dark:text-[#A1A1AA] border-[#EAEAEA] dark:border-[#27272A] hover:bg-[#F5F5F5] dark:hover:bg-[#202026]'
                          }`}
                        >
                          {timing.label}
                        </button>
                      ))}
                    </div>

                    {deliveryTiming === 'custom' && (
                      <input
                        type="text"
                        value={customTimingText}
                        onChange={(e) => setCustomTimingText(e.target.value)}
                        placeholder="حدد التاريخ أو الوقت المطلوب (مثال: يوم الخميس بعد الساعة 5)..."
                        className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3 py-2 text-xs outline-hidden mt-1"
                      />
                    )}
                  </div>

                  {/* Optional Driver Notes */}
                  <div>
                    <label className="block text-[#666666] dark:text-[#A1A1AA] font-medium mb-1">
                      ملاحظات إضافية للتوصيل (اختياري):
                    </label>
                    <input
                      type="text"
                      value={customer.notes}
                      onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                      placeholder="مثال: يرجى الاتصال قبل الوصول بـ 15 دقيقة..."
                      className="w-full bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E35] focus:border-[#C5A059] rounded-lg px-3 py-2 text-xs outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer & Direct In-App Order Action */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:px-6 border-t border-[#EAEAEA] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#141418] space-y-3">
            {/* Price Calculations breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#666666] dark:text-[#A1A1AA]">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold text-[#1A1A1A] dark:text-white">{formatIQD(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>الخصم ({appliedCoupon?.code}):</span>
                  <span>-{formatIQD(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#666666] dark:text-[#A1A1AA]">
                <span>أجور التوصيل:</span>
                <span className={isFreeDelivery ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'font-semibold text-[#1A1A1A] dark:text-white'}>
                  {isFreeDelivery ? 'مجاني' : formatIQD(deliveryFee)}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-[#1A1A1A] dark:text-white pt-2 border-t border-[#EAEAEA] dark:border-[#27272A]">
                <span>المبلغ المطلوب عند الاستلام:</span>
                <span className="text-[#C5A059] dark:text-[#FFE58F] font-bold text-lg">{formatIQD(finalTotal)}</span>
              </div>
            </div>

            {/* Direct In-App Checkout Button */}
            <button
              type="button"
              id="cart-direct-checkout-btn"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDirectCheckout(e); }}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#1A1A1A] to-[#2E2E33] hover:from-black hover:to-[#1A1A1A] text-white font-bold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                  <span>جاري تثبيت وتأكيد الطلب...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-[#C5A059]" />
                  <span>تأكيد الطلب المباشر ({formatIQD(finalTotal)})</span>
                </>
              )}
            </button>

            {/* Direct WhatsApp Ordering Button */}
            <button
              type="button"
              id="cart-whatsapp-order-btn"
              onClick={async (e) => {
                await handleDirectCheckout(e, true);
              }}
              disabled={isSubmitting}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              <span>أو إرسال الطلب مباشرة عبر واتساب 💬</span>
            </button>

            <div className="text-center text-[11px] text-[#888888] flex items-center justify-center gap-2">
              <span>💳 دفع عند الاستلام</span>
              <span>•</span>
              <span>🛵 توصيل سريع</span>
              <span>•</span>
              <span>📍 تتبع فوري</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Interactive Map Picker Modal */}
      <InteractiveMapPicker
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirm={handleMapConfirm}
        initialLocation={location}
        initialBackup={{
          district: customer.district || '',
          nearestLandmark: customer.nearestLandmark || '',
          houseDetails: customer.houseDetails || '',
        }}
      />
    </motion.div>
  );
};
