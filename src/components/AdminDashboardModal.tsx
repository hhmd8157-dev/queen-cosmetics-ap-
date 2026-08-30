import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Package,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Phone,
  MessageCircle,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  AlertCircle,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Send,
  Sparkles,
  Bell,
  BellRing,
  Smartphone,
  Play,
  Flame,
  Radio,
  Users,
  User,
  Key,
  Bot,
  Tag,
  Plus,
  Edit3
} from 'lucide-react';
import { Order, OrderStatus, Product, Category } from '../types';
import { formatIQD, STORE_INFO, getStoredProducts, saveStoredProducts, CATEGORIES, getStoredCategories, saveStoredCategories, PRODUCTS } from '../data/products';
import { getProductImageUrl } from '../utils/image';
import { 
  updateProductPricingInFirestore, 
  toggleProductStockInFirestore, 
  updateProductInFirestore,
  forceSyncAllToFirestore,
  deleteProductFromFirestore
} from '../services/productsFirestoreService';
import {
  initAudioContext,
  playRoyalOrderChime,
  playSuccessChime,
  requestBrowserNotificationPermission,
  getNotificationPermissionStatus,
  triggerDeviceVibration,
  showOrderPushNotification,
  showChatPushNotification,
  getOrdersBroadcastChannel,
  NewOrderNotificationData,
  broadcastOrderStatusChangeLocally
} from '../utils/alerts';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  // PIN Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('queen_admin_auth') === 'true' || localStorage.getItem('queen_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Notifications & Sound Alert State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('queen_admin_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [soundVolume, setSoundVolume] = useState<number>(0.9);
  const [soundRepeats, setSoundRepeats] = useState<number>(2);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [autoEnableAlertsOnLogin, setAutoEnableAlertsOnLogin] = useState<boolean>(true);
  const [testAlertSuccess, setTestAlertSuccess] = useState<string | null>(null);
  const [newOrderAlertBanner, setNewOrderAlertBanner] = useState<Order | null>(null);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [driverNoteInput, setDriverNoteInput] = useState<{ [orderId: string]: string }>({});
  const [selectedProductDetail, setSelectedProductDetail] = useState<{ product: Product; quantity: number } | null>(null);
  const [fullScreenOrderModal, setFullScreenOrderModal] = useState<Order | null>(null);

  const [adminMainTab, setAdminMainTab] = useState<'orders' | 'products' | 'telegram' | 'alerts_settings' | 'chats' | 'categories'>('orders');
  const [adminProducts, setAdminProducts] = useState<Product[]>(() => getStoredProducts());
  const [adminCategories, setAdminCategories] = useState<Category[]>(() => getStoredCategories());
  const [productSearch, setProductSearch] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Category management states
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');

  const handleAddCategory = () => {
    const trimmedName = newCatNameAr.trim();
    const trimmedId = newCatId.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (!trimmedName || !trimmedId) {
      alert('يرجى ملء اسم القسم باللغة العربية والإنجليزية/المعرّف.');
      return;
    }
    
    if (adminCategories.some(c => c.id === trimmedId)) {
      alert('هذا المعرّف موجود بالفعل! يرجى اختيار معرّف فريد باللغة الإنجليزية.');
      return;
    }
    
    const parsedSubs = newCatSubs
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map((sub, index) => ({
        id: `sub_${index}_${Date.now()}`,
        name: sub
      }));
      
    const subCategories = [
      { id: 'all', name: 'الكل' },
      ...parsedSubs
    ];
    
    const newCategory: Category = {
      id: trimmedId as any,
      name: trimmedName,
      enName: trimmedId,
      iconName: 'Tag',
      description: `قسم ${trimmedName} الفاخر`,
      subCategories
    };
    
    const updated = [...adminCategories, newCategory];
    setAdminCategories(updated);
    saveStoredCategories(updated);
    
    setNewCatNameAr('');
    setNewCatId('');
    setNewCatSubs('');
    
    setSaveSuccessMsg('تمت إضافة القسم الجديد بنجاح! 🎉');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };
  
  const handleDeleteCategory = (catId: string) => {
    const protectedIds = ['all', 'bestsellers', 'offers'];
    if (protectedIds.includes(catId)) {
      alert('لا يمكن حذف هذا القسم الأساسي للمتجر لضمان عمل الفلاتر بشكل صحيح.');
      return;
    }
    
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف التصنيفات الفرعية المرتبطة به أيضاً.')) {
      return;
    }
    
    const updated = adminCategories.filter(c => c.id !== catId);
    setAdminCategories(updated);
    saveStoredCategories(updated);
    
    setSaveSuccessMsg('تم حذف القسم بنجاح! 🗑️');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Product Edit & Add Modal State
  const [editingProductModal, setEditingProductModal] = useState<Product | null>(null);
  const [isAddingNewProductModal, setIsAddingNewProductModal] = useState<boolean>(false);
  const [productForm, setProductForm] = useState<{
    id?: string;
    name: string;
    price: number;
    originalPrice: number | undefined;
    discountPercent: number;
    category: string;
    subCategory: string;
    image: string;
    description: string;
    inStock: boolean;
    isOffer: boolean;
    isBestSeller: boolean;
  }>({
    name: '',
    price: 10000,
    originalPrice: 12000,
    discountPercent: 17,
    category: 'perfumes',
    subCategory: '',
    image: '',
    description: '',
    inStock: true,
    isOffer: true,
    isBestSeller: false,
  });

  const openAddProductModal = () => {
    setProductForm({
      name: '',
      price: 10000,
      originalPrice: 12000,
      discountPercent: 17,
      category: 'perfumes',
      subCategory: '',
      image: '',
      description: '',
      inStock: true,
      isOffer: true,
      isBestSeller: false,
    });
    setIsAddingNewProductModal(true);
  };

  const openEditProductModal = (prod: Product) => {
    const orig = prod.originalPrice;
    const curr = prod.price;
    const disc = (orig && orig > curr) ? Math.round(((orig - curr) / orig) * 100) : 0;

    setProductForm({
      id: prod.id,
      name: prod.name,
      price: curr,
      originalPrice: orig,
      discountPercent: disc,
      category: prod.category || 'perfumes',
      subCategory: prod.subCategory || '',
      image: prod.image || '',
      description: prod.description || '',
      inStock: prod.inStock !== false,
      isOffer: Boolean(prod.isOffer || (orig && orig > curr)),
      isBestSeller: Boolean(prod.isBestSeller),
    });
    setEditingProductModal(prod);
  };

  const handleFormOriginalPriceChange = (valStr: string) => {
    const orig = valStr !== '' ? parseFloat(valStr) : undefined;
    setProductForm(prev => {
      let currPrice = prev.price;
      let disc = prev.discountPercent;
      if (orig && orig > 0) {
        if (disc > 0) {
          currPrice = Math.round(orig * (1 - disc / 100));
        } else if (currPrice < orig) {
          disc = Math.round(((orig - currPrice) / orig) * 100);
        }
      }
      return {
        ...prev,
        originalPrice: orig,
        price: currPrice,
        discountPercent: disc,
        isOffer: Boolean(orig && orig > currPrice),
      };
    });
  };

  const handleFormDiscountPercentChange = (valStr: string) => {
    const disc = valStr !== '' ? Math.max(0, Math.min(100, parseFloat(valStr))) : 0;
    setProductForm(prev => {
      let currPrice = prev.price;
      let orig = prev.originalPrice;
      if (disc > 0) {
        if (orig && orig > 0) {
          currPrice = Math.round(orig * (1 - disc / 100));
        } else if (prev.price > 0) {
          orig = Math.round(prev.price / (1 - disc / 100));
        }
      } else {
        if (orig) currPrice = orig;
      }
      return {
        ...prev,
        discountPercent: disc,
        price: currPrice,
        originalPrice: orig,
        isOffer: disc > 0 || Boolean(orig && orig > currPrice),
      };
    });
  };

  const handleFormSellingPriceChange = (valStr: string) => {
    const currPrice = valStr !== '' ? parseFloat(valStr) : 0;
    setProductForm(prev => {
      let disc = prev.discountPercent;
      let orig = prev.originalPrice;
      if (orig && orig > currPrice && currPrice > 0) {
        disc = Math.round(((orig - currPrice) / orig) * 100);
      } else if (disc > 0 && currPrice > 0) {
        orig = Math.round(currPrice / (1 - disc / 100));
      }
      return {
        ...prev,
        price: currPrice,
        discountPercent: disc,
        originalPrice: orig,
        isOffer: Boolean(orig && orig > currPrice),
      };
    });
  };

  const handleSaveProductForm = async () => {
    if (!productForm.name.trim()) {
      alert('يرجى كتابة اسم المنتج أولاً.');
      return;
    }
    if (!productForm.price || productForm.price <= 0) {
      alert('يرجى إدخال سعر بيع صحيح للمنتج.');
      return;
    }

    const finalOrigPrice = productForm.originalPrice && productForm.originalPrice > productForm.price
      ? productForm.originalPrice
      : undefined;
    const isOffer = Boolean(finalOrigPrice || productForm.isOffer);

    let updated: Product[];
    if (productForm.id) {
      updated = adminProducts.map(p => {
        if (p.id === productForm.id) {
          return {
            ...p,
            name: productForm.name.trim(),
            price: productForm.price,
            originalPrice: finalOrigPrice,
            category: productForm.category as any,
            subCategory: productForm.subCategory || undefined,
            image: productForm.image || p.image,
            description: productForm.description || p.description,
            inStock: productForm.inStock,
            isOffer: isOffer,
            isBestSeller: productForm.isBestSeller,
          };
        }
        return p;
      });
    } else {
      const newId = `prod-${Date.now()}`;
      const newProduct: Product = {
        id: newId,
        name: productForm.name.trim(),
        price: productForm.price,
        originalPrice: finalOrigPrice,
        category: productForm.category as any,
        subCategory: productForm.subCategory || undefined,
        image: productForm.image.trim() || '/products/placeholder.txt',
        description: productForm.description.trim() || `منتج ${productForm.name.trim()} الأصلي متوفر لدى كوزمتك الملكة.`,
        rating: 5,
        reviewCount: 1,
        inStock: productForm.inStock,
        isOffer: isOffer,
        isBestSeller: productForm.isBestSeller,
      };
      updated = [newProduct, ...adminProducts];
    }

    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));

    try {
      if (productForm.id) {
        await updateProductInFirestore(productForm.id, {
          name: productForm.name.trim(),
          price: productForm.price,
          originalPrice: finalOrigPrice,
          category: productForm.category,
          subCategory: productForm.subCategory,
          image: productForm.image,
          description: productForm.description,
          inStock: productForm.inStock,
          isOffer: isOffer,
          isBestSeller: productForm.isBestSeller,
        });
      } else {
        await forceSyncAllToFirestore(updated);
      }
      setSaveSuccessMsg('تم حفظ وتحديث سعر المنتج بنجاح ومزامنته سحابياً! ☁️✨');
    } catch (e) {
      console.error('Firestore sync error:', e);
      setSaveSuccessMsg('تم حفظ وتعديل المنتج محلياً بنجاح! ✨');
    }

    setTimeout(() => setSaveSuccessMsg(null), 3000);
    setEditingProductModal(null);
    setIsAddingNewProductModal(false);
  };

  useEffect(() => {
    if (isOpen) {
      setAdminProducts(getStoredProducts());
    }
  }, [isOpen]);

  // Private Customer Chats State
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [selectedChatOrderId, setSelectedChatOrderId] = useState<string | null>(null);
  const [selectedChatMessages, setSelectedChatMessages] = useState<any[]>([]);
  const [adminChatInput, setAdminChatInput] = useState<string>('');
  const [isSendingAdminChat, setIsSendingAdminChat] = useState<boolean>(false);
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');

  // Toast Notification state for instant customer chat messages
  const [chatToastAlert, setChatToastAlert] = useState<{
    id: string;
    orderId: string;
    customerName: string;
    text: string;
    createdAt: string;
  } | null>(null);
  const knownChatMessageIdsRef = useRef<Set<string>>(new Set());

  // Telegram Integration State
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [isTelegramSyncing, setIsTelegramSyncing] = useState<boolean>(false);
  const [isTelegramTesting, setIsTelegramTesting] = useState<boolean>(false);
  const [telegramMsgResult, setTelegramMsgResult] = useState<{ text: string; isError: boolean } | null>(null);
  const [customChatIdInput, setCustomChatIdInput] = useState<string>('');
  const [customTokenInput, setCustomTokenInput] = useState<string>('');
  const [isEditingToken, setIsEditingToken] = useState<boolean>(false);

  // New Redesign States (Live Clock, Profit Calculator, Dispatch Sheet)
  const [currentTime, setCurrentTime] = useState<string>(() => new Date().toLocaleTimeString('ar-IQ'));
  const [isLiveSystemActive, setIsLiveSystemActive] = useState<boolean>(true);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(35);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-IQ'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyDailyDispatchSheet = () => {
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    if (activeOrders.length === 0) {
      alert('لا توجد طلبات نشطة حالياً لإرسالها للمندوب.');
      return;
    }

    let sheetText = `👑 *كشف طلبيات التوصيل - كوزمتك الملكة* 👑\n📅 ${new Date().toLocaleDateString('ar-IQ')} | الوقت: ${currentTime}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    activeOrders.forEach((o, index) => {
      sheetText += `📦 *طلب #${o.trackingCode}* (${index + 1})\n`;
      sheetText += `👤 ${o.customer.name} | 📞 ${o.customer.phone}\n`;
      sheetText += `📍 ${o.customer.governorate} - ${o.customer.address}\n`;
      sheetText += `💰 المطلوب: ${formatIQD(o.total)}\n`;
      if (o.customer.notes) sheetText += `📝 ملاحظة: ${o.customer.notes}\n`;
      sheetText += `────────────────────\n`;
    });

    navigator.clipboard.writeText(sheetText);
    alert('تم نسخ كشف التوصيل الكامل لجميع الطلبات النشطة بنجاح! جاهز للإرسال للمندوب عبر الواتساب 📋');
  };

  const handleSendQuickWhatsAppReply = (order: Order, messageType: 'preparing' | 'on_the_way') => {
    const msg = messageType === 'preparing'
      ? `مرحباً أستاذ(ة) ${order.customer.name} 🌸\nنود إعلامك أن طلبك ذي الرمز (#${order.trackingCode}) لدى *كوزمتك الملكة* أصبح الآن (قيد التجهيز والتغليف الملكي) وسيتم تسليمه للمندوب قريباً جداً. شكراً لثقتكم بنا ✨`
      : `مرحباً أستاذ(ة) ${order.customer.name} 🛵\nنود إعلامك أن طلبك ذي الرمز (#${order.trackingCode}) قد خرج مع مندوب التوصيل وهو في طريقه إليك الآن. يرجى إبقاء الهاتف قريبًا. شكراً لتعاملكم مع *كوزمتك الملكة* 👑`;
    
    const url = `https://wa.me/964${order.customer.phone.replace(/^0+/, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Keep track of known order IDs so we only alert for NEW incoming orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchDoneRef = useRef<boolean>(false);

  // Check notification permission on mount
  useEffect(() => {
    setNotifPermission(getNotificationPermissionStatus());
    if (isAuthenticated) {
      fetchTelegramStatus();
    }
  }, [isAuthenticated]);

  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.ok) {
        setTelegramStatus(data);
        if (data.config?.fullToken) {
          setCustomTokenInput(data.config.fullToken);
        }
      }
    } catch (e) {
      console.error('Failed to fetch telegram status:', e);
    }
  };

  const handleSyncTelegram = async () => {
    setIsTelegramSyncing(true);
    setTelegramMsgResult(null);
    try {
      const res = await fetch('/api/telegram/sync', { method: 'POST' });
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.ok) {
        setTelegramMsgResult({
          text: `تمت المزامنة بنجاح! عدد المحادثات المسجلة الآن: ${data.chatIds?.length || 0}`,
          isError: false,
        });
        await fetchTelegramStatus();
      } else {
        setTelegramMsgResult({
          text: `تعذر المزامنة: ${data.error || 'تأكد من فتح البوت والضغط على Start'}`,
          isError: true,
        });
      }
    } catch (e: any) {
      setTelegramMsgResult({ text: `خطأ بالاتصال: ${e?.message || 'فشلت المزامنة'}`, isError: true });
    } finally {
      setIsTelegramSyncing(false);
    }
  };

  const handleTestTelegram = async (targetChatId?: string) => {
    setIsTelegramTesting(true);
    setTelegramMsgResult(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: targetChatId || undefined }),
      });
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      setTelegramMsgResult({
        text: data.message,
        isError: !data.success,
      });
    } catch (e: any) {
      setTelegramMsgResult({ text: `فشل الاختبار: ${e?.message}`, isError: true });
    } finally {
      setIsTelegramTesting(false);
    }
  };

  const handleAddCustomChatId = async () => {
    const cid = customChatIdInput.trim();
    if (!cid) return;
    const currentChats = telegramStatus?.config?.chatIds || [];
    if (currentChats.includes(cid)) {
      setTelegramMsgResult({ text: 'معرف المحادثة مضاف مسبقاً!', isError: false });
      return;
    }
    const newChats = [...currentChats, cid];
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds: newChats }),
      });
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.success) {
        setCustomChatIdInput('');
        setTelegramMsgResult({ text: 'تمت إضافة معرف المحادثة بنجاح!', isError: false });
        await fetchTelegramStatus();
      }
    } catch (e: any) {
      setTelegramMsgResult({ text: `فشل الحفظ: ${e?.message}`, isError: true });
    }
  };

  const handleRemoveChatId = async (cidToRemove: string) => {
    const currentChats = telegramStatus?.config?.chatIds || [];
    const newChats = currentChats.filter((c: string) => c !== cidToRemove);
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds: newChats }),
      });
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.success) {
        setTelegramMsgResult({ text: 'تم حذف معرف المحادثة', isError: false });
        await fetchTelegramStatus();
      }
    } catch (e: any) {
      setTelegramMsgResult({ text: `فشل الحذف: ${e?.message}`, isError: true });
    }
  };

  const handleSaveBotToken = async () => {
    const token = customTokenInput.trim();
    if (!token) return;
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token }),
      });
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.success) {
        setIsEditingToken(false);
        setTelegramMsgResult({ text: 'تم حفظ توكن البوت بنجاح!', isError: false });
        await fetchTelegramStatus();
      }
    } catch (e: any) {
      setTelegramMsgResult({ text: `فشل حفظ التوكن: ${e?.message}`, isError: true });
    }
  };

  // Save sound setting
  useEffect(() => {
    try {
      localStorage.setItem('queen_admin_sound_enabled', String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  const handleUpdateProductImage = async (productId: string, newImgUrl: string) => {
    const updated = adminProducts.map(p => p.id === productId ? { ...p, image: newImgUrl } : p);
    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));
    try {
      await updateProductInFirestore(productId, { image: newImgUrl });
      setSaveSuccessMsg('تم تحديث صورة المنتج ومزامنتها سحابياً! ☁️');
    } catch (e) {
      console.error('Cloud image sync error:', e);
      setSaveSuccessMsg('تم حفظ الصورة محلياً بنجاح!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleUpdateProductSubCategory = async (productId: string, newSubCategory: string) => {
    const updated = adminProducts.map(p => p.id === productId ? { ...p, subCategory: newSubCategory } : p);
    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));
    try {
      await updateProductInFirestore(productId, { subCategory: newSubCategory });
      setSaveSuccessMsg('تم تحديث التصنيف الفرعي ومزامنته سحابياً! ☁️');
    } catch (e) {
      console.error('Cloud subCategory sync error:', e);
      setSaveSuccessMsg('تم حفظ التصنيف الفرعي محلياً!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleProductFileUpload = (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleUpdateProductImage(productId, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProductPrice = async (productId: string, price: number, originalPrice?: number) => {
    const isOffer = typeof originalPrice === 'number' && originalPrice > price;
    const updated = adminProducts.map(p => p.id === productId ? { 
      ...p, 
      price, 
      originalPrice: originalPrice && originalPrice > 0 ? originalPrice : undefined,
      isOffer
    } : p);
    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));
    try {
      await updateProductPricingInFirestore(productId, price, originalPrice);
      setSaveSuccessMsg('تم تحديث الأسعار ومزامنتها سحابياً لجميع الأجهزة! ☁️');
    } catch (e) {
      console.error('Cloud price sync error:', e);
      setSaveSuccessMsg('تم حفظ السعر محلياً بنجاح!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج نهائياً من المتجر؟')) {
      return;
    }
    const updated = adminProducts.filter(p => p.id !== productId);
    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));
    
    try {
      await deleteProductFromFirestore(productId);
      setSaveSuccessMsg('تم حذف المنتج ومسحه من السحابة بنجاح! 🗑️☁️');
    } catch (e) {
      console.error('Cloud product delete error:', e);
      setSaveSuccessMsg('تم حذف المنتج محلياً بنجاح! 🗑️');
    }
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleToggleStock = async (productId: string) => {
    let nextInStock = true;
    const updated = adminProducts.map(p => {
      if (p.id === productId) {
        nextInStock = p.inStock === false ? true : false;
        return { 
          ...p, 
          inStock: nextInStock, 
          stockCount: nextInStock ? undefined : 0 
        };
      }
      return p;
    });
    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));
    try {
      await toggleProductStockInFirestore(productId, nextInStock);
      setSaveSuccessMsg(nextInStock ? 'تم جعل المنتج متوفراً لجميع الأجهزة! ☁️' : 'تم تحويل المنتج إلى غير متوفر لجميع الأجهزة! ☁️');
    } catch (e) {
      console.error('Cloud stock sync error:', e);
      setSaveSuccessMsg('تم تحديث حالة التوفر محلياً!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleToggleOffer = async (productId: string) => {
    let newIsOffer = false;
    let newOrigPrice: number | undefined = undefined;
    let targetPrice = 0;

    const updated = adminProducts.map(p => {
      if (p.id === productId) {
        newIsOffer = !p.isOffer;
        targetPrice = p.price;
        newOrigPrice = newIsOffer ? (p.originalPrice || Math.round(p.price * 1.25)) : undefined;
        return { ...p, isOffer: newIsOffer, originalPrice: newOrigPrice };
      }
      return p;
    });
    setAdminProducts(updated);
    saveStoredProducts(updated);
    window.dispatchEvent(new Event('queen_products_updated'));
    try {
      await updateProductPricingInFirestore(productId, targetPrice, newOrigPrice);
      setSaveSuccessMsg('تم تحديث وتثبيت حالة العرض في السحابة! ☁️');
    } catch (e) {
      console.error('Cloud offer sync error:', e);
      setSaveSuccessMsg('تم تحديث حالة العرض بنجاح!');
    }
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Trigger alert for a new order
  const triggerNewOrderAlert = (order: Order) => {
    // 1. Play loud royal sound alert
    if (soundEnabled) {
      playRoyalOrderChime(soundVolume, soundRepeats);
    }

    // 2. Trigger browser push notification
    showOrderPushNotification({
      id: order.id,
      trackingCode: order.trackingCode,
      customer: order.customer,
      total: order.total,
    });

    // 3. Trigger vibration on mobile phone
    triggerDeviceVibration([400, 150, 400, 150, 800]);

    // 4. Show top visual banner
    setNewOrderAlertBanner(order);
  };

  // Poll orders & listen to cross-tab broadcast events when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchOrders(false);
    
    // Fast polling every 2.5 seconds to guarantee instant alerts
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 2500);

    // Cross-tab broadcast channel listener (instant trigger if order placed in another tab on same device)
    const channel = getOrdersBroadcastChannel();
    const handleBroadcastMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NEW_ORDER' && e.data?.order) {
        const orderData = e.data.order;
        if (!knownOrderIdsRef.current.has(orderData.id)) {
          knownOrderIdsRef.current.add(orderData.id);
          triggerNewOrderAlert(orderData);
          fetchOrders(true);
        }
      }
    };

    if (channel) {
      channel.addEventListener('message', handleBroadcastMessage);
    }

    // Window custom event listener for same tab
    const handleSameTabOrder = (e: any) => {
      const order = e.detail;
      if (order && !knownOrderIdsRef.current.has(order.id)) {
        knownOrderIdsRef.current.add(order.id);
        triggerNewOrderAlert(order);
        fetchOrders(true);
      }
    };
    window.addEventListener('queen_new_order_event', handleSameTabOrder);

    return () => {
      clearInterval(interval);
      if (channel) {
        channel.removeEventListener('message', handleBroadcastMessage);
      }
      window.removeEventListener('queen_new_order_event', handleSameTabOrder);
    };
  }, [isAuthenticated, soundEnabled, soundVolume, soundRepeats]);

  const fetchChatThreads = async () => {
    try {
      const res = await fetch('/api/chats');
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.threads) {
        setChatThreads(data.threads);
      }
    } catch (err) {
      console.error('Failed to fetch chat threads:', err);
    }
  };

  const fetchSelectedChatMessages = async (orderId: string) => {
    try {
      const res = await fetch(`/api/chats/${orderId}/messages?readBy=admin`);
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.messages) {
        setSelectedChatMessages(data.messages);
        fetchChatThreads();
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    }
  };

  const handleAdminSendChatMessage = async () => {
    if (!adminChatInput.trim() || !selectedChatOrderId) return;
    const text = adminChatInput.trim();
    setAdminChatInput('');
    setIsSendingAdminChat(true);

    try {
      const res = await fetch(`/api/chats/${selectedChatOrderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'admin',
          senderName: 'إدارة كوزمتك الملكة 👑',
          text,
        }),
      });
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (data.message) {
        setSelectedChatMessages((prev) => [...prev, data.message]);
        fetchChatThreads();
      }
    } catch (err) {
      console.error('Failed to send admin chat message:', err);
    } finally {
      setIsSendingAdminChat(false);
    }
  };

  const handleOpenChatFromToast = (orderId: string) => {
    setAdminMainTab('chats');
    setSelectedChatOrderId(orderId);
    fetchSelectedChatMessages(orderId);
    setChatToastAlert(null);

    setTimeout(() => {
      const chatSection = document.getElementById('admin-chat-messages-container');
      if (chatSection) {
        chatSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById('admin-chat-input-field');
      if (inputEl) {
        inputEl.focus();
      }
    }, 250);
  };

  const totalUnreadChatsCount = chatThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Poll chats & SSE event listener for instant chat alerts
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchChatThreads();

    const chatInterval = setInterval(() => {
      fetchChatThreads();
      if (selectedChatOrderId) {
        fetchSelectedChatMessages(selectedChatOrderId);
      }
    }, 15000);

    // EventSource for real-time SSE chat messages
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/orders/events');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'NEW_CHAT_MESSAGE') {
            fetchChatThreads();
            const orderId = parsed.data?.orderId || parsed.data?.trackingCode || parsed.data?.message?.orderId;
            const customerName = parsed.data?.customerName || parsed.data?.message?.senderName || 'زبون المتجر';
            const msg = parsed.data?.message;

            if (selectedChatOrderId && orderId && selectedChatOrderId.toUpperCase() === selectedChatOrderId.toUpperCase()) {
              fetchSelectedChatMessages(orderId);
            }

            if (msg && msg.sender === 'customer') {
              if (!knownChatMessageIdsRef.current.has(msg.id)) {
                knownChatMessageIdsRef.current.add(msg.id);

                if (soundEnabled) {
                  playRoyalOrderChime(soundVolume, 1);
                }
                triggerDeviceVibration([200, 100, 200]);

                setChatToastAlert({
                  id: msg.id,
                  orderId: orderId,
                  customerName: customerName,
                  text: msg.text,
                  createdAt: msg.createdAt || new Date().toISOString(),
                });

                showChatPushNotification(
                  {
                    orderId: orderId,
                    customerName: customerName,
                    text: msg.text,
                  },
                  () => {
                    handleOpenChatFromToast(orderId);
                  }
                );
              }
            }
          }
        } catch (e) {
          console.error('SSE parse error in admin chat:', e);
        }
      };
    } catch (e) {
      console.error('SSE connection failed:', e);
    }

    return () => {
      clearInterval(chatInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, selectedChatOrderId, soundEnabled, soundVolume]);

  const fetchOrders = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error("HTTP error " + res.status); const data = await res.json();
      if (res.ok && Array.isArray(data.orders)) {
        const incomingOrders: Order[] = data.orders;

        if (!isInitialFetchDoneRef.current) {
          // First load: seed the known orders so we don't alert for old existing orders
          knownOrderIdsRef.current = new Set(incomingOrders.map((o) => o.id));
          isInitialFetchDoneRef.current = true;
        } else {
          // Subsequent checks: identify newly arrived orders
          const brandNewOrders = incomingOrders.filter((o) => !knownOrderIdsRef.current.has(o.id));
          
          if (brandNewOrders.length > 0) {
            brandNewOrders.forEach((newOrder) => {
              knownOrderIdsRef.current.add(newOrder.id);
              triggerNewOrderAlert(newOrder);
            });
          }
        }

        setOrders(incomingOrders);
      }
    } catch (e) {
      console.error('Error fetching admin orders:', e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // PIN Submit Handler with automatic sound activation & notification authorization
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');

    const cleanPin = pinInput.trim();
    if (cleanPin === '1234' || cleanPin === '2025' || cleanPin === 'queen' || cleanPin === 'الوالد') {
      // 1. Authenticate
      setIsAuthenticated(true);
      try {
        sessionStorage.setItem('queen_admin_auth', 'true');
        localStorage.setItem('queen_admin_auth', 'true');
        localStorage.setItem('queen_father_device_alerts', 'true');
      } catch {}

      // 2. Unlock Web Audio Context on this user gesture (vital for mobile browsers)
      initAudioContext();
      playSuccessChime();
      triggerDeviceVibration([200, 100, 200]);

      // 3. Request Notification Permission if requested
      if (autoEnableAlertsOnLogin && 'Notification' in window) {
        try {
          const perm = await requestBrowserNotificationPermission();
          setNotifPermission(perm);

          if (perm === 'granted') {
            // Send welcome push notification to father's device
            new Notification('👑 تم تفعيل لوحة وتنبيهات جهاز الوالد!', {
              body: 'جاهز لاستقبال الطلبات الفورية بالصوت والإشعار.',
              icon: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=192',
            });
          }
        } catch (err) {
          console.warn('Notification permission request error:', err);
        }
      }

      setPinInput('');
    } else {
      setPinError('رمز الدخول غير صحيح (الرمز الافتراضي: 1234)');
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await requestBrowserNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setTestAlertSuccess('تم منح إذن إشعارات المتصفح بنجاح! 🎉');
      setTimeout(() => setTestAlertSuccess(null), 3000);
      new Notification('👑 تنبيهات كوزمتك الملكة مفعلة', {
        body: 'تم تفعيل إشعارات المتصفح على جهاز الوالد بنجاح!',
        icon: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=192',
      });
    } else if (perm === 'denied') {
      alert('تم رفض إذن الإشعارات من إعدادات المتصفح. يمكنك تفعيلها يدوياً من إعدادات الموقع.');
    }
  };

  const handleTestChimeAndNotification = () => {
    // 1. Play chime
    playRoyalOrderChime(soundVolume, soundRepeats);

    // 2. Vibrate
    triggerDeviceVibration([300, 100, 300, 100, 600]);

    // 3. Push notification
    showOrderPushNotification({
      id: 'test-sample-' + Date.now(),
      trackingCode: 'ORD-TEST',
      customer: {
        name: 'تجربة تنبيه الوالد (طلب اختباري)',
        phone: '07800000000',
        governorate: 'البصرة',
        district: 'العشار',
        address: 'شارع الكويت',
      },
      total: 35000,
    });

    setTestAlertSuccess('تم تشغيل رنة التنبيه العالية وإرسال إشعار تجريبي 🔔');
    setTimeout(() => setTestAlertSuccess(null), 3500);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const note = driverNoteInput[orderId];
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          driverNotes: note !== undefined ? note : undefined,
        }),
      });

      if (res.ok) {
        const targetOrder = orders.find((o) => o.id === orderId || o.trackingCode === orderId);
        if (targetOrder) {
          broadcastOrderStatusChangeLocally({
            orderId: targetOrder.id,
            trackingCode: targetOrder.trackingCode,
            previousStatus: targetOrder.status,
            newStatus,
            customerName: targetOrder.customer.name,
            driverNotes: note !== undefined ? note : targetOrder.driverNotes,
            timestamp: new Date().toISOString(),
          });
        }

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.trackingCode === orderId
              ? { ...o, status: newStatus, statusUpdatedAt: new Date().toISOString(), driverNotes: note !== undefined ? note : o.driverNotes }
              : o
          )
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً؟')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId && o.trackingCode !== orderId));
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  const handleCopyDispatchText = (order: Order) => {
    const itemsList = order.items
      .map((i) => `- ${i.product.name} (عدد: ${i.quantity})`)
      .join('\n');

    const text = `👑 *طلب توصيل جديد - كوزمتك الملكة* 👑
🏷️ *رقم التتبع:* #${order.trackingCode}
👤 *الزبون:* ${order.customer.name}
📞 *الهاتف:* ${order.customer.phone}
📍 *المحافظة:* ${order.customer.governorate}
${order.customer.district ? `🏘️ *المنطقة / الحي:* ${order.customer.district}\n` : ''}${order.customer.nearestLandmark ? `🎯 *أقرب نقطة دالة:* ${order.customer.nearestLandmark}\n` : ''}${order.customer.houseDetails ? `🏠 *تفاصيل البيت:* ${order.customer.houseDetails}\n` : ''}📄 *العنوان الإضافي:* ${order.customer.address}
${order.location ? `🗺️ *رابط موقع المندوب (Google Maps الدقيق):* ${order.location.mapUrl}\n📍 *الإحداثيات:* ${order.location.latitude}, ${order.location.longitude}\n` : ''}
📦 *المنتجات المطلوبة:*
${itemsList}

💰 *المجموع:* ${formatIQD(order.subtotal)}
🚚 *أجور التوصيل:* ${order.deliveryFee === 0 ? 'مجاني' : formatIQD(order.deliveryFee)}
💵 *المطلوب من الزبون:* ${formatIQD(order.total)}
⏰ *موعد التوصيل المفضل:* ${order.deliveryTiming === 'today' ? 'اليوم' : order.deliveryTiming === 'tomorrow' ? 'غداً' : 'خلال هذا الأسبوع'} ${order.customTimingText || ''}
${order.customer.notes ? `📝 *ملاحظات الزبون:* ${order.customer.notes}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLogout = () => {
    if (window.confirm('هل تود تسجيل الخروج من لوحة الوالد؟')) {
      try {
        sessionStorage.removeItem('queen_admin_auth');
        localStorage.removeItem('queen_admin_auth');
      } catch {}
      setIsAuthenticated(false);
    }
  };

  // Filter and search
  const filteredOrders = orders.filter((o) => {
    const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesFilter;

    const matchesSearch =
      o.trackingCode.toLowerCase().includes(query) ||
      o.customer.name.toLowerCase().includes(query) ||
      o.customer.phone.includes(query) ||
      o.customer.address.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    received: orders.filter((o) => o.status === 'received').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    outForDelivery: orders.filter((o) => o.status === 'out_for_delivery').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    revenue: orders
      .filter((o) => o.status === 'delivered')
      .reduce((acc, o) => acc + o.total, 0),
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-fade-in w-full">
      <div
        className="w-full h-full sm:h-auto sm:max-w-5xl bg-[#121214] text-white sm:rounded-2xl shadow-2xl border-0 sm:border border-[#2E2E33] overflow-hidden flex flex-col sm:max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header - Ultra-Modern Glassmorphic VIP Design */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-[#18181B] via-[#1F1B15] to-[#18181B] border-b border-[#D4AF37]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/30 to-[#C5A059]/10 border-2 border-[#D4AF37]/60 flex items-center justify-center text-[#FFE58F] shadow-lg animate-pulse shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg bg-gradient-to-r from-[#FFE58F] via-white to-[#D4AF37] bg-clip-text text-transparent">
                  أهلاً بك أستاذ علاء | العقل المدبر للمتجر 👑
                </h2>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-[#A1A1AA]">
                <span className="font-mono text-amber-300 font-bold bg-black/40 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                  ⏰ {currentTime}
                </span>
                <button
                  onClick={() => setIsLiveSystemActive(!isLiveSystemActive)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] transition-all cursor-pointer ${
                    isLiveSystemActive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isLiveSystemActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
                  <span>{isLiveSystemActive ? 'النظام مباشر 🟢' : 'متوقف مؤقتاً ⏸️'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 relative z-10 w-full sm:w-auto justify-end">
            {isAuthenticated && (
              <div className="contents">
                {/* Send Orders Dispatch Sheet to Delivery Driver */}
                <button
                  onClick={handleCopyDailyDispatchSheet}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="نسخ كشف الطلبات النشطة للمندوب"
                >
                  <Bike className="w-4 h-4 text-black" />
                  <span className="hidden md:inline">كشف المندوب 📋</span>
                </button>

                {/* Sound Quick Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    soundEnabled
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-xs'
                      : 'bg-[#27272A] border-[#3F3F46] text-[#A1A1AA]'
                  }`}
                  title={soundEnabled ? 'صوت التنبيه العالي مفعّل' : 'صوت التنبيه مكتوم'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                  <span className="hidden sm:inline">{soundEnabled ? 'الصوت مفعّل' : 'مكتوم'}</span>
                </button>

                {/* Test Chime Quick Button */}
                <button
                  onClick={handleTestChimeAndNotification}
                  className="p-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#FFE58F] hover:text-white rounded-xl border border-[#D4AF37]/40 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="تجربة صوت الرنة وإشعار المتصفح"
                >
                  <BellRing className="w-4 h-4 text-[#D4AF37]" />
                  <span className="hidden lg:inline">تجربة الرنة 🔔</span>
                </button>

                {/* Refresh Orders */}
                <button
                  onClick={() => fetchOrders(false)}
                  disabled={isLoading}
                  className="p-2 bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white rounded-xl border border-[#3F3F46] transition-colors cursor-pointer"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D4AF37]' : ''}`} />
                </button>

                {/* Lock / Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-[#71717A] hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                  title="قفل اللوحة"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Barrier or Admin Content */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#C5A059]/20 to-[#D4AF37]/10 border-2 border-[#D4AF37]/40 text-[#FFE58F] flex items-center justify-center mx-auto shadow-xl relative">
              <Lock className="w-9 h-9 text-[#FFE58F]" />
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full border border-black animate-pulse">
                LIVE 🔔
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">تسجيل الدخول للوحة الوالد 👑</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                أدخل رمز الأمان لتفعيل نظام استلام الطلبات، التنبيه الصوتي العالي، وإشعارات المتصفح الفورية لهذا الجهاز.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1 text-right">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="أدخل رمز PIN (الافتراضي: 1234)"
                  autoFocus
                  className="w-full bg-[#18181B] border-2 border-[#3F3F46] focus:border-[#D4AF37] text-white text-center text-xl font-mono tracking-widest rounded-xl px-4 py-3.5 outline-hidden transition-all shadow-inner"
                />
              </div>

              {/* Automatic Father's Device Activation checkbox */}
              <label className="flex items-center gap-2.5 bg-[#18181B] p-3 rounded-xl border border-[#2E2E33] cursor-pointer text-right select-none">
                <input
                  type="checkbox"
                  checked={autoEnableAlertsOnLogin}
                  onChange={(e) => setAutoEnableAlertsOnLogin(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer shrink-0"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#FFE58F] block">تفعيل التنبيه الصوتي وإشعارات المتصفح تلقائياً</span>
                  <span className="text-[11px] text-[#A1A1AA]">تثبيت الإشعارات الفورية والرنة الملكية لهذا الجهاز حصراً</span>
                </div>
              </label>

              {pinError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-600/50 rounded-xl text-xs text-rose-300 font-semibold flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-extrabold text-sm sm:text-base py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-[#C5A059]/25 cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4 text-black stroke-[2.5]" />
                <span>دخول اللوحة وتفعيل التنبيهات الفورية</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5">
            {/* Live Father Device Alert Status Bar */}
            <div className="bg-gradient-to-r from-[#1E1710] via-[#2A1E14] to-[#1E1710] p-4 rounded-2xl border-2 border-[#D4AF37]/50 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/60 flex items-center justify-center text-[#FFE58F] shrink-0 text-xl shadow-inner animate-pulse">
                  🔔
                </div>
                <div className="space-y-0.5 text-right">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <h3 className="font-extrabold text-sm sm:text-base text-[#FFE58F]">
                      نظام التنبيهات الفورية لجهاز الوالد شغال 🟢
                    </h3>
                  </div>
                  <p className="text-xs text-[#D4D4D8]">
                    ستنطلق رنة عالية مميزة وإشعار فوري على هاتفك لحظة وصول أي طلب من أي زبون
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Browser Notification Status / Grant Button */}
                {notifPermission !== 'granted' ? (
                  <button
                    onClick={handleRequestNotifications}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer animate-bounce border border-amber-300"
                  >
                    <Bell className="w-4 h-4" />
                    <span>تفعيل إشعارات الطلبات والرسائل 🔔</span>
                  </button>
                ) : (
                  <div className="bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>إشعارات الطلبات والرسائل مفعّلة ✅</span>
                  </div>
                )}

                {/* Test Sound & Notification Trigger */}
                <button
                  onClick={handleTestChimeAndNotification}
                  className="bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>تجربة الرنة والإشعار 🔊</span>
                </button>
              </div>
            </div>

            {testAlertSuccess && (
              <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-md">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>{testAlertSuccess}</span>
              </div>
            )}

            {/* Pulsating New Incoming Order Banner if active */}
            {newOrderAlertBanner && (
              <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-2 border-amber-400 text-white p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce">
                <div className="flex items-center gap-3.5 text-right">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center text-2xl font-black shrink-0 shadow-lg">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        طلب جديد الآن!
                      </span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        #{newOrderAlertBanner.trackingCode}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-white mt-1">
                      الزبون: {newOrderAlertBanner.customer.name} ({newOrderAlertBanner.customer.governorate}) — {formatIQD(newOrderAlertBanner.total)}
                    </h4>
                    <p className="text-xs text-amber-200/80">
                      العنوان: {newOrderAlertBanner.customer.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      handleCopyDispatchText(newOrderAlertBanner);
                      setNewOrderAlertBanner(null);
                    }}
                    className="flex-1 md:flex-initial bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ للمندوب</span>
                  </button>

                  <button
                    onClick={() => {
                      handleStatusChange(newOrderAlertBanner.id, 'preparing');
                      setNewOrderAlertBanner(null);
                    }}
                    className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>بدء التجهيز</span>
                  </button>

                  <button
                    onClick={() => setNewOrderAlertBanner(null)}
                    className="p-2 text-stone-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Instant Floating Toast Notification for New Customer Chat Message */}
            {chatToastAlert && (
              <div className="bg-gradient-to-r from-[#1A1813] via-[#242018] to-[#1A1813] border-2 border-[#D4AF37] text-white p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce shrink-0">
                <div className="flex items-start gap-3 text-right flex-1 w-full">
                  <div className="w-10 h-10 rounded-2xl bg-[#D4AF37] text-black flex items-center justify-center text-xl font-black shrink-0 shadow-lg">
                    💬
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          رسالة جديدة من زبون
                        </span>
                        <span className="font-bold text-sm text-white flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {chatToastAlert.customerName}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#FFE58F] bg-black/50 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/40">
                        #{chatToastAlert.orderId}
                      </span>
                    </div>
                    <p className="text-xs text-stone-200 bg-black/40 p-2.5 rounded-xl border border-[#2E2E33] leading-relaxed line-clamp-2">
                      "{chatToastAlert.text}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => handleOpenChatFromToast(chatToastAlert.orderId)}
                    className="flex-1 md:flex-initial bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>فتح المحادثة فوراً ⚡</span>
                  </button>

                  <button
                    onClick={() => setChatToastAlert(null)}
                    className="p-2.5 text-stone-400 hover:text-white rounded-xl bg-[#27272A] hover:bg-[#3F3F46] transition-colors cursor-pointer text-xs font-bold"
                    title="تجاهل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
              <div className="bg-[#18181B] p-3 rounded-xl border border-[#2E2E33] space-y-1">
                <span className="text-[11px] text-[#A1A1AA]">إجمالي الطلبات</span>
                <p className="text-lg font-bold text-white">{stats.total}</p>
              </div>

              <div className="bg-[#18181B] p-3 rounded-xl border border-amber-500/30 space-y-1">
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>جديدة / بالانتظار</span>
                </span>
                <p className="text-lg font-bold text-amber-300">{stats.received}</p>
              </div>

              <div className="bg-[#18181B] p-3 rounded-xl border border-blue-500/30 space-y-1">
                <span className="text-[11px] text-blue-400 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>جاري التجهيز</span>
                </span>
                <p className="text-lg font-bold text-blue-300">{stats.preparing}</p>
              </div>

              <div className="bg-[#18181B] p-3 rounded-xl border border-purple-500/30 space-y-1">
                <span className="text-[11px] text-purple-400 flex items-center gap-1">
                  <Bike className="w-3 h-3" />
                  <span>مع المندوب</span>
                </span>
                <p className="text-lg font-bold text-purple-300">{stats.outForDelivery}</p>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-[#18181B] p-3 rounded-xl border border-emerald-500/30 space-y-1">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم التوصيل</span>
                </span>
                <p className="text-lg font-bold text-emerald-300">{stats.delivered}</p>
              </div>
            </div>

            {/* Daily Report & Profit Calculator Widget */}
            <div className="bg-gradient-to-br from-[#18181B] to-[#121214] p-4 rounded-2xl border border-[#D4AF37]/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  📈
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#FFE58F]">تقرير المبيعات والأرباح اليومية</h4>
                  <p className="text-xs text-[#A1A1AA]">
                    إجمالي المبيعات المؤكدة (تم التوصيل): <strong className="text-emerald-400 font-mono">{formatIQD(stats.revenue)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="text-right">
                  <span className="text-[11px] text-[#A1A1AA] block">صافي الربح التقديري ({profitMarginPercent}%)</span>
                  <strong className="text-sm font-mono text-[#D4AF37]">
                    {formatIQD(Math.round(stats.revenue * (profitMarginPercent / 100)))}
                  </strong>
                </div>

                <div className="flex items-center gap-1 bg-[#27272A] px-2.5 py-1.5 rounded-xl border border-[#3F3F46]">
                  <span className="text-[10px] text-[#A1A1AA]">نسبة الربح:</span>
                  <select
                    value={profitMarginPercent}
                    onChange={(e) => setProfitMarginPercent(Number(e.target.value))}
                    className="bg-black text-amber-300 text-xs font-bold px-2 py-1 rounded-lg border border-[#D4AF37]/40 outline-hidden"
                  >
                    <option value={25}>25%</option>
                    <option value={30}>30%</option>
                    <option value={35}>35%</option>
                    <option value={40}>40%</option>
                    <option value={50}>50%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Main Admin Switcher Tabs: Orders vs Telegram vs Products vs Alert Settings */}
            <div className="flex flex-wrap items-center gap-2 bg-[#18181B] p-1.5 rounded-xl border border-[#2E2E33]">
              <button
                onClick={() => setAdminMainTab('orders')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminMainTab === 'orders'
                    ? 'bg-[#D4AF37] text-black shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>إدارة الطلبات ({orders.length})</span>
              </button>

              <button
                onClick={() => {
                  setAdminMainTab('chats');
                  fetchChatThreads();
                }}
                className={`py-2 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
                  adminMainTab === 'chats'
                    ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>محادثات الزبائن 💬</span>
                {totalUnreadChatsCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-black animate-pulse">
                    {totalUnreadChatsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setAdminMainTab('telegram');
                  fetchTelegramStatus();
                }}
                className={`py-2 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminMainTab === 'telegram'
                    ? 'bg-[#229ED9] text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>بوت التلجرام 🤖</span>
                {telegramStatus?.config?.chatIds?.length > 0 && (
                  <span className="bg-emerald-500 text-black text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {telegramStatus.config.chatIds.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminMainTab('products')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminMainTab === 'products'
                    ? 'bg-[#D4AF37] text-black shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>إدارة المنتجات ({adminProducts.length})</span>
              </button>

              <button
                onClick={() => setAdminMainTab('categories')}
                className={`py-2 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminMainTab === 'categories'
                    ? 'bg-[#D4AF37] text-black shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>إدارة الأقسام ({adminCategories.length})</span>
              </button>

              <button
                onClick={() => setAdminMainTab('alerts_settings')}
                className={`py-2 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  adminMainTab === 'alerts_settings'
                    ? 'bg-[#D4AF37] text-black shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <BellRing className="w-4 h-4" />
                <span>إعدادات التنبيه 🔔</span>
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {adminMainTab === 'chats' ? (
              <div className="bg-[#18181B] rounded-2xl p-4 sm:p-6 border border-[#2E2E33] space-y-6 text-right">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2E2E33] pb-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span>قسم المحادثات المباشرة مع الزبائن (Customer Live Chats) 💬</span>
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">
                      تواصل فوري ومباشر مع زبائن المتجر بخصوصية تامة واستجابة لحظية ⚡
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={fetchChatThreads}
                      className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FFE58F] border border-[#D4AF37]/40 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>تحديث المحادثات</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter */}
                <div className="relative">
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="ابحث برقم الطلب #ORD-XXXX، اسم الزبون، أو رقم الهاتف..."
                    className="w-full bg-[#121214] border border-[#27272A] focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white outline-hidden"
                  />
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                </div>

                {/* Chats Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Threads List Sidebar (Cols 5) */}
                  <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {chatThreads.length === 0 ? (
                      <div className="p-8 text-center text-[#A1A1AA] space-y-2 bg-[#121214] rounded-xl border border-[#27272A]">
                        <MessageSquare className="w-8 h-8 mx-auto text-[#52525B]" />
                        <p className="text-xs font-semibold">لا توجد محادثات زبائن نشطة حالياً</p>
                      </div>
                    ) : (
                      chatThreads
                        .filter((t) => {
                          const q = chatSearchQuery.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            t.orderId.toLowerCase().includes(q) ||
                            (t.customerName && t.customerName.toLowerCase().includes(q)) ||
                            (t.customerPhone && t.customerPhone.includes(q))
                          );
                        })
                        .map((thread) => {
                          const isSelected = selectedChatOrderId === thread.orderId;
                          return (
                            <div
                              key={thread.orderId}
                              onClick={() => {
                                setSelectedChatOrderId(thread.orderId);
                                fetchSelectedChatMessages(thread.orderId);
                              }}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                                isSelected
                                  ? 'bg-emerald-950/60 border-emerald-500/80 shadow-md'
                                  : 'bg-[#121214] border-[#27272A] hover:border-[#3F3F46]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-xs text-[#FFE58F] bg-[#27272A] px-2 py-0.5 rounded-md">
                                  #{thread.orderId}
                                </span>

                                {thread.unreadCount > 0 && (
                                  <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                                    {thread.unreadCount} جديد
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                                  {thread.customerName || 'زبون المتجر'}
                                </h4>
                                {thread.customerPhone && (
                                  <span className="text-[11px] text-[#A1A1AA] font-mono" dir="ltr">
                                    {thread.customerPhone}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#A1A1AA] truncate font-normal">
                                {thread.lastMessage}
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-[#71717A] pt-1 border-t border-[#27272A]/50">
                                <span>
                                  {new Date(thread.lastMessageTime).toLocaleTimeString('ar-IQ', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span>{thread.messageCount} رسالة</span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Selected Chat Box (Cols 7) */}
                  <div className="lg:col-span-7 bg-[#121214] rounded-xl border border-[#27272A] p-4 flex flex-col justify-between min-h-[420px] space-y-4">
                    {!selectedChatOrderId ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <MessageSquare className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-sm text-white">اختر زبوناً من القائمة الجانبية</h4>
                        <p className="text-xs text-[#A1A1AA] max-w-xs leading-relaxed">
                          اضغط على أي طلب لعرض سجل المحادثة الكامل والرد الفوري على استفسارات الزبون.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Active Thread Header */}
                        {(() => {
                          const activeThread = chatThreads.find((t) => t.orderId === selectedChatOrderId);
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-3">
                              <div>
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                  <span>الزبون: {activeThread?.customerName || 'زبون المتجر'}</span>
                                  <span className="font-mono text-xs text-[#FFE58F]">
                                    (#{selectedChatOrderId})
                                  </span>
                                </h4>
                                {activeThread?.customerPhone && (
                                  <p className="text-xs text-[#A1A1AA]" dir="ltr">
                                    📞 {activeThread.customerPhone} | 📍 {activeThread.governorate || 'البصرة'}
                                  </p>
                                )}
                              </div>

                              {activeThread?.customerPhone && (
                                <a
                                  href={`https://wa.me/${activeThread.customerPhone.replace(/\+/g, '')}?text=${encodeURIComponent(
                                    `مرحباً ${activeThread.customerName || ''}، معكم إدارة كوزمتك الملكة بخصوص طلبكم #${selectedChatOrderId}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#25D366] hover:bg-[#1EBE5D] text-black font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>واتساب الزبون</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}

                        {/* Messages Thread Container */}
                        <div id="admin-chat-messages-container" className="h-[300px] overflow-y-auto space-y-3 p-3 bg-[#0D0D10] rounded-xl border border-[#27272A] flex-1">
                          {selectedChatMessages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-center text-xs text-[#71717A]">
                              لا توجد رسائل سابقة في هذه المحادثة. يمكنك بدء المحادثة بكتابة أول رد.
                            </div>
                          ) : (
                            selectedChatMessages.map((msg) => {
                              const isAdmin = msg.sender === 'admin';
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}
                                >
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] px-1">
                                    {isAdmin ? (
                                      <span className="font-bold text-emerald-400">
                                        إدارة كوزمتك الملكة 👑
                                      </span>
                                    ) : (
                                      <span className="font-bold text-[#FFE58F]">
                                        {msg.senderName || 'الزبون'}
                                      </span>
                                    )}
                                    <span>•</span>
                                    <span>
                                      {new Date(msg.createdAt).toLocaleTimeString('ar-IQ', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>

                                  <div
                                    className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                      isAdmin
                                        ? 'bg-emerald-950 text-emerald-100 border border-emerald-500/50 rounded-tl-none shadow-xs'
                                        : 'bg-[#C5A059] text-black font-bold rounded-tr-none shadow-xs'
                                    }`}
                                  >
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Admin Message Form Input */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAdminSendChatMessage();
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            id="admin-chat-input-field"
                            type="text"
                            value={adminChatInput}
                            onChange={(e) => setAdminChatInput(e.target.value)}
                            placeholder="اكتب إجابتك أو ردك للزبون هنا..."
                            className="flex-1 bg-[#0D0D10] border border-[#27272A] focus:border-emerald-500 rounded-xl px-4 py-3 text-xs sm:text-sm outline-hidden text-white"
                          />
                          <button
                            type="submit"
                            disabled={isSendingAdminChat || !adminChatInput.trim()}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
                          >
                            <span>إرسال الرد</span>
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : adminMainTab === 'telegram' ? (
              <div className="bg-[#18181B] rounded-2xl p-4 sm:p-6 border border-[#2E2E33] space-y-6 text-right">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2E2E33] pb-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/50 flex items-center justify-center text-[#229ED9]">
                        <Bot className="w-5 h-5" />
                      </div>
                      <span>ربط الطلبات ببوت التلجرام الفوري (Telegram Notifications)</span>
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">
                      إرسال تفاصيل كل طلب جديد فوراً إلى هاتف الوالد على تطبيق Telegram بدون تأخير
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncTelegram}
                      disabled={isTelegramSyncing}
                      className="bg-[#229ED9] hover:bg-[#1E88E5] text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTelegramSyncing ? 'animate-spin' : ''}`} />
                      <span>{isTelegramSyncing ? 'جاري المزامنة...' : 'مزامنة المشتركين 🔄'}</span>
                    </button>

                    <button
                      onClick={() => handleTestTelegram()}
                      disabled={isTelegramTesting}
                      className="bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Send className={`w-3.5 h-3.5 ${isTelegramTesting ? 'animate-pulse' : ''}`} />
                      <span>{isTelegramTesting ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي 📨'}</span>
                    </button>
                  </div>
                </div>

                {/* Feedback Banner */}
                {telegramMsgResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                      telegramMsgResult.isError
                        ? 'bg-red-950/80 border-red-500/50 text-red-300'
                        : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    }`}
                  >
                    {telegramMsgResult.isError ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{telegramMsgResult.text}</span>
                  </div>
                )}

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Bot Connection Card */}
                  <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-2">
                    <span className="text-[11px] text-[#A1A1AA] font-bold block">حالة البوت</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-sm font-bold text-emerald-400">
                        {telegramStatus?.isConnected ? 'متصل وجاهز للخدمة ✅' : 'شغال ونشط 🟢'}
                      </span>
                    </div>
                    {telegramStatus?.botInfo?.username && (
                      <a
                        href={`https://t.me/${telegramStatus.botInfo.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#229ED9] hover:underline flex items-center gap-1 mt-1 font-mono"
                      >
                        <span>@{telegramStatus.botInfo.username}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Registered Devices Count */}
                  <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-2">
                    <span className="text-[11px] text-[#A1A1AA] font-bold block">الأجهزة المسجلة للاستلام</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {telegramStatus?.config?.chatIds?.length || 0}
                      </span>
                      <span className="text-xs text-[#A1A1AA]">محادثة / حساب</span>
                    </div>
                    <p className="text-[11px] text-[#71717A]">
                      تصل رسالة الطلب الجديد لكل حساب مسجل في نفس اللحظة
                    </p>
                  </div>

                  {/* Message Format Info */}
                  <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-2">
                    <span className="text-[11px] text-[#A1A1AA] font-bold block">محتوى رسالة الإشعار</span>
                    <div className="text-[11px] text-amber-300 font-medium space-y-0.5">
                      <div>✓ اسم ورقم هاتف الزبون</div>
                      <div>✓ المنتجات والكميات والسعر الإجمالي</div>
                      <div>✓ العنوان ورابط GPS على خرائط Google</div>
                    </div>
                  </div>
                </div>

                {/* Easy How-to Guide for Father */}
                <div className="bg-gradient-to-br from-[#121214] to-[#1A1813] p-4 sm:p-5 rounded-xl border border-[#D4AF37]/40 space-y-3">
                  <h4 className="font-bold text-sm text-[#FFE58F] flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                    <span>طريقة تشغيل وتلقي الطلبات على هاتف الوالد (خطوات بسيطة جداً):</span>
                  </h4>
                  <ol className="text-xs text-[#D4D4D8] space-y-2 list-decimal list-inside pr-1 leading-relaxed">
                    <li>
                      افتح تطبيق <strong className="text-white">Telegram</strong> على هاتفك.
                    </li>
                    <li>
                      ابحث عن البوت المخصص للمحل أو اضغط على رابط البوت واضغط على زر <strong className="text-amber-400 font-bold">Start (ابدأ)</strong>.
                    </li>
                    <li>
                      ارجع هنا واضغط على زر <strong className="text-[#229ED9]">"مزامنة المشتركين 🔄"</strong> ليتم تسجيل رقم حسابك تلقائياً.
                    </li>
                    <li>
                      اضغط على <strong className="text-[#D4AF37]">"إرسال إشعار تجريبي 📨"</strong> للتأكد من وصول الرسائل لهاتفك فوراً.
                    </li>
                  </ol>
                </div>

                {/* Subscribed Chats List & Manual Addition */}
                <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#D4AF37]" />
                      <span>قائمة المحادثات والمجموعات المستلمة للطلبات</span>
                    </h4>
                    <span className="text-[11px] text-[#A1A1AA]">
                      {telegramStatus?.config?.chatIds?.length || 0} حساب مسجل
                    </span>
                  </div>

                  {(!telegramStatus?.config?.chatIds || telegramStatus.config.chatIds.length === 0) ? (
                    <div className="bg-black/30 border border-dashed border-[#2E2E33] p-4 rounded-xl text-center space-y-2">
                      <p className="text-xs text-amber-300 font-semibold">
                        لم يتم تسجيل أي حساب بعد!
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">
                        افتح البوت في التلجرام واضغط Start ثم اضغط زر "مزامنة المشتركين 🔄" بالأعلى ليظهر حسابك هنا.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {telegramStatus.config.chatIds.map((chatId: string) => (
                        <div
                          key={chatId}
                          className="bg-[#18181B] p-3 rounded-lg border border-[#2E2E33] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                              ID
                            </div>
                            <div>
                              <span className="font-mono text-xs font-bold text-white block">
                                {chatId}
                              </span>
                              <span className="text-[10px] text-emerald-400">
                                جهاز مسجل لاستقبال الإشعارات الفورية ✅
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestTelegram(chatId)}
                              disabled={isTelegramTesting}
                              className="px-2.5 py-1.5 rounded-lg bg-[#2E2E33] hover:bg-[#3E3E44] text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>اختبار</span>
                            </button>
                            <button
                              onClick={() => handleRemoveChatId(chatId)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Add Chat ID */}
                  <div className="pt-2 border-t border-[#2E2E33]/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={customChatIdInput}
                      onChange={(e) => setCustomChatIdInput(e.target.value)}
                      placeholder="أو أضف معرف محادثة / كروب يدوياً (مثلاً: 123456789)..."
                      className="flex-1 bg-[#18181B] border border-[#2E2E33] focus:border-[#229ED9] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A] outline-hidden font-mono"
                    />
                    <button
                      onClick={handleAddCustomChatId}
                      className="bg-[#2E2E33] hover:bg-[#3E3E44] text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      إضافة يدوية +
                    </button>
                  </div>
                </div>

                {/* Bot Token Configuration */}
                <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#D4AF37]" />
                      <h4 className="font-bold text-xs text-white">إعدادات رمز البوت (Bot Token)</h4>
                    </div>
                    <button
                      onClick={() => setIsEditingToken(!isEditingToken)}
                      className="text-xs text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      {isEditingToken ? 'إلغاء' : 'تعديل التوكن'}
                    </button>
                  </div>

                  {isEditingToken ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customTokenInput}
                        onChange={(e) => setCustomTokenInput(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white font-mono outline-hidden"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveBotToken}
                          className="bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-bold px-4 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                        >
                          حفظ التوكن
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-xs bg-black/40 p-2.5 rounded-lg text-[#A1A1AA] border border-[#2E2E33] flex items-center justify-between">
                      <span>{telegramStatus?.config?.tokenPreview || '8886220024:AAFf...PVCtU0'}</span>
                      <span className="text-[10px] text-emerald-400 font-sans font-bold">مضبوط ومثبت</span>
                    </div>
                  )}
                </div>
              </div>
            ) : adminMainTab === 'alerts_settings' ? (
              <div className="bg-[#18181B] rounded-2xl p-4 sm:p-6 border border-[#2E2E33] space-y-6 text-right">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#D4AF37]" />
                    <span>إعدادات التنبيه الصوتي وإشعارات المتصفح (جهاز الوالد)</span>
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    تخصيص قوة ونغمة التنبيه عند وصول أي طلب من الزبائن مباشرة
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sound Toggle & Volume */}
                  <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">تفعيل صوت الرنة الملكية</span>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          soundEnabled ? 'bg-emerald-500 text-black' : 'bg-stone-700 text-stone-300'
                        }`}
                      >
                        {soundEnabled ? 'مفعّل 🔊' : 'معطل 🔇'}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-[#A1A1AA] flex justify-between">
                        <span>مستوى صوت التنبيه:</span>
                        <span className="font-mono text-emerald-400">{Math.round(soundVolume * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={soundVolume}
                        onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                        className="w-full accent-[#D4AF37] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-xs text-[#A1A1AA] block">عدد مرات تكرار الرنة لكل طلب:</label>
                      <div className="flex gap-2">
                        {[
                          { id: 1, label: 'رنة واحدة' },
                          { id: 2, label: 'رنتين (موصى به)' },
                          { id: 3, label: '3 رنات متتالية' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setSoundRepeats(opt.id)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                              soundRepeats === opt.id
                                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                                : 'bg-[#18181B] text-[#A1A1AA] border-[#2E2E33]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Browser Push Notifications status */}
                  <div className="bg-[#121214] p-4 rounded-xl border border-[#2E2E33] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">إشعارات المتصفح (Web Push)</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        notifPermission === 'granted'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                          : 'bg-amber-950 text-amber-400 border border-amber-700'
                      }`}>
                        {notifPermission === 'granted' ? 'مسموح بها 📲' : notifPermission === 'denied' ? 'مرفوضة من المتصفح ❌' : 'بحاجة للإذن ⚠️'}
                      </span>
                    </div>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      تتيح ظهور إشعار منبثق فوري على شاشة الهاتف حتى إذا كان المتصفح مصغراً أو في الخلفية.
                    </p>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleRequestNotifications}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>طلب إذن الإشعارات</span>
                      </button>

                      <button
                        onClick={handleTestChimeAndNotification}
                        className="flex-1 bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-black" />
                        <span>اختبار التنبيه 🔊</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : adminMainTab === 'categories' ? (
              <div className="space-y-6">
                {/* 1. Add Category Form */}
                <div className="bg-[#18181B] p-5 rounded-2xl border border-[#2E2E33] space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2E2E33] pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 flex items-center justify-center text-[#D4AF37]">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white">إضافة قسم جديد للمتجر 🏷️</h4>
                      <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                        قم بإضافة قسم جديد وسوف يظهر كفلتر رئيسي في الواجهة وفي صفحة المنتجات تلقائياً.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-white">اسم القسم (العربية) *</label>
                      <input
                        type="text"
                        value={newCatNameAr}
                        onChange={(e) => setNewCatNameAr(e.target.value)}
                        placeholder="مثلاً: العناية بالشعر"
                        className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-3 rounded-xl outline-hidden"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-white">المعرّف بالإنجليزية (ID) *</label>
                      <input
                        type="text"
                        value={newCatId}
                        onChange={(e) => setNewCatId(e.target.value)}
                        placeholder="مثلاً: haircare"
                        className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-3 rounded-xl outline-hidden text-left font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-white flex justify-between">
                      <span>الأقسام الفرعية (اختياري)</span>
                      <span className="text-[10px] text-[#A1A1AA]">افصل بين كل قسم بفاصلة (,)</span>
                    </label>
                    <input
                      type="text"
                      value={newCatSubs}
                      onChange={(e) => setNewCatSubs(e.target.value)}
                      placeholder="مثلاً: زيوت, شامبو, بلسم, سيروم"
                      className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-3 rounded-xl outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleAddCategory}
                      className="bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:brightness-110 text-black text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>حفظ وإضافة القسم</span>
                    </button>
                  </div>
                </div>

                {/* 2. Categories List */}
                <div className="bg-[#18181B] p-5 rounded-2xl border border-[#2E2E33] space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2E2E33] pb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 flex items-center justify-center text-[#D4AF37]">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white">الأقسام الحالية المتاحة في المتجر ({adminCategories.length})</h4>
                      <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                        قائمة بجميع الأقسام والفلترز الحالية. يمكنك حذف أي قسم تم إنشاؤه يدوياً.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#2E2E33] text-[#A1A1AA] font-bold">
                          <th className="py-3 px-2">القسم (العربية)</th>
                          <th className="py-3 px-2">المعرّف (ID)</th>
                          <th className="py-3 px-2">الأقسام الفرعية</th>
                          <th className="py-3 px-2 text-center w-24">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2E2E33]/40">
                        {adminCategories.map((cat) => {
                          const isProtected = ['all', 'bestsellers', 'offers'].includes(cat.id);
                          const subsExcludingAll = (cat.subCategories || []).filter(s => s.id !== 'all').map(s => s.name);
                          
                          return (
                            <tr key={cat.id} className="hover:bg-white/2 transition-colors">
                              <td className="py-3 px-2 font-bold text-white">{cat.name}</td>
                              <td className="py-3 px-2 font-mono text-amber-300">{cat.id}</td>
                              <td className="py-3 px-2 text-[#A1A1AA]">
                                {subsExcludingAll.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {subsExcludingAll.map((s, idx) => (
                                      <span key={idx} className="bg-[#27272A] text-white text-[10px] px-2 py-0.5 rounded-full border border-white/5 font-bold">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[#52525B] italic">لا يوجد تصنيفات فرعية</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {isProtected ? (
                                  <span className="text-[10px] bg-[#22c55e]/10 text-emerald-400 border border-emerald-800/30 px-2 py-0.5 rounded-md font-bold">
                                    أساسي للمتجر 🔒
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-600/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto animate-pulse-once"
                                    title="حذف هذا القسم"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-400" />
                                    <span>حذف</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : adminMainTab === 'products' ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#18181B] p-4 rounded-xl border border-[#2E2E33]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-white">إدارة المنتجات، الأسعار والخصومات 🏷️</h3>
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>☁️</span>
                        <span>مربوط بالسحابة المباشرة</span>
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      يمكنك تحديد السعر الأصلي والسعر بعد الخصم وحالة التوفر لكل منتج ومزامنتها لحظياً لجميع الأجهزة.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openAddProductModal}
                      className="bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:brightness-110 text-black text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md cursor-pointer"
                      title="إضافة منتج جديد وتحديد سعره للمتجر"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة منتج جديد</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await forceSyncAllToFirestore(adminProducts);
                          setSaveSuccessMsg(`تمت مزامنة جميع المنتجات الـ ${adminProducts.length} مع قاعدة البيانات السحابية! ☁️✅`);
                          setTimeout(() => setSaveSuccessMsg(null), 3000);
                        } catch (err) {
                          console.error(err);
                          setSaveSuccessMsg('حدث خطأ أثناء المزامنة، يرجى المحاولة لاحقاً');
                          setTimeout(() => setSaveSuccessMsg(null), 3000);
                        }
                      }}
                      className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap border border-[#3F3F46]"
                      title="مزامنة فورية شاملة مع قاعدة بيانات Firebase السحابية"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>مزامنة سحابية</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (window.confirm('هل أنت متأكد من إعادة ضبط المنتجات للمجموعة الأصلية الافتراضية (103 منتج)؟ سيتم حذف أي تعديلات أو منتجات قمت بإضافتها.')) {
                          try {
                            localStorage.removeItem('queen_cosmetics_products_clean_v1');
                            const defaultProds = PRODUCTS;
                            setAdminProducts(defaultProds);
                            saveStoredProducts(defaultProds);
                            window.dispatchEvent(new Event('queen_products_updated'));
                            await forceSyncAllToFirestore(defaultProds);
                            setSaveSuccessMsg('تمت إعادة ضبط جميع المنتجات الـ 103 للأصل ومزامنتها بنجاح! 🔄✨');
                            setTimeout(() => setSaveSuccessMsg(null), 3000);
                          } catch (err) {
                            console.error(err);
                            setSaveSuccessMsg('تمت إعادة الضبط محلياً بنجاح! 🔄');
                            setTimeout(() => setSaveSuccessMsg(null), 3000);
                          }
                        }
                      }}
                      className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      title="استعادة الـ 103 منتج الأصلية"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                      <span>إعادة ضبط للأصل</span>
                    </button>
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="بحث عن منتج لتعديله..."
                        className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A] outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {adminProducts
                    .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.brand || p.category || '').toLowerCase().includes(productSearch.toLowerCase()))
                    .map((product) => {
                      const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
                      const discountPercentage = hasDiscount 
                        ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
                        : null;

                      return (
                        <div 
                          key={product.id} 
                          className="bg-[#18181B] rounded-xl p-4 border border-[#2E2E33] hover:border-[#3F3F46] transition-all flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between"
                        >
                          {/* Product Info & Photo */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-16 h-16 rounded-xl bg-black/50 overflow-hidden border border-[#2E2E33] shrink-0 relative group shadow-inner">
                              {product.image ? (
                                <img src={getProductImageUrl(product)} alt={product.name} className="w-full h-full object-contain bg-white" />
                              ) : (
                                <div className="w-full h-full bg-[#27272A] flex items-center justify-center text-[10px] text-[#A1A1AA]">
                                  بدون صورة
                                </div>
                              )}
                              <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity text-center p-1">
                                <span>تغيير الصورة</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleProductFileUpload(product.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-[#C5A059] font-bold bg-[#C5A059]/10 px-2 py-0.5 rounded-md border border-[#C5A059]/20">
                                  {product.brand || product.category || 'كوزمتك الملكة'}
                                </span>
                                {hasDiscount && (
                                  <span className="text-[10px] text-rose-300 font-bold bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-600/30">
                                    🔥 خصم {discountPercentage}%
                                  </span>
                                )}
                                {product.inStock === false && (
                                  <span className="text-[10px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-600/30">
                                    نفدت الكمية
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{product.name}</h4>
                              <div className="flex items-center gap-2.5 text-xs">
                                <span className="font-bold text-emerald-400">
                                  السعر الحالي: {formatIQD(product.price)}
                                </span>
                                {product.originalPrice && (
                                  <span className="text-[11px] text-[#71717A] line-through">
                                    قبل الخصم: {formatIQD(product.originalPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pricing & Control Inputs */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#121214] p-2.5 rounded-xl border border-[#27272A]">
                            {/* 1. Original Price Input (السعر الأصلي قبل الخصم) */}
                            <div className="flex flex-col gap-1 w-full sm:w-24">
                              <label className="text-[10px] text-[#A1A1AA] font-medium text-right flex items-center justify-between">
                                <span>السعر الأصلي</span>
                              </label>
                              <input
                                type="number"
                                defaultValue={product.originalPrice || ''}
                                key={`orig-${product.id}-${product.originalPrice}`}
                                onBlur={(e) => {
                                  const origVal = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                  handleUpdateProductPrice(product.id, product.price, origVal);
                                }}
                                placeholder="مثلاً: 8000"
                                className="bg-[#18181B] border border-[#2E2E33] focus:border-[#D4AF37] text-[11px] text-amber-300 font-bold px-2 py-1.5 rounded-lg outline-hidden w-full text-center"
                                title="السعر الأصلي قبل التخفيض"
                              />
                            </div>

                            {/* 2. Discount Percentage Input (نسبة الخصم %) - placed beside Original Price */}
                            <div className="flex flex-col gap-1 w-full sm:w-20">
                              <label className="text-[10px] text-rose-400 font-medium text-right flex items-center justify-between">
                                <span>الخصم %</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                defaultValue={discountPercentage ?? ''}
                                key={`disc-${product.id}-${discountPercentage}`}
                                onBlur={(e) => {
                                  const discVal = e.target.value ? Math.max(0, Math.min(100, parseInt(e.target.value, 10))) : 0;
                                  let orig = product.originalPrice;
                                  let newPrice = product.price;

                                  if (discVal > 0) {
                                    if (!orig || orig <= product.price) {
                                      orig = Math.round(product.price * (1 + discVal / 100));
                                    }
                                    newPrice = Math.round(orig * (1 - discVal / 100));
                                  } else {
                                    orig = undefined;
                                  }
                                  handleUpdateProductPrice(product.id, newPrice, orig);
                                }}
                                placeholder="0%"
                                className="bg-[#18181B] border border-rose-900/50 focus:border-rose-500 text-[11px] text-rose-300 font-bold px-2 py-1.5 rounded-lg outline-hidden w-full text-center"
                                title="نسبة الخصم المئوية"
                              />
                            </div>

                            {/* 3. Current / Discounted Price Input (سعر البيع بعد الخصم) */}
                            <div className="flex flex-col gap-1 w-full sm:w-24">
                              <label className="text-[10px] text-emerald-400 font-medium text-right flex items-center justify-between">
                                <span>سعر البيع</span>
                              </label>
                              <input
                                type="number"
                                defaultValue={product.price}
                                key={`price-${product.id}-${product.price}`}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val > 0) {
                                    handleUpdateProductPrice(product.id, val, product.originalPrice);
                                  }
                                }}
                                placeholder="السعر د.ع"
                                className="bg-[#18181B] border border-[#2E2E33] focus:border-emerald-500 text-[11px] text-emerald-400 font-bold px-2 py-1.5 rounded-lg outline-hidden w-full text-center"
                                title="السعر الفعلي المعتمد للطلب والشراء"
                              />
                            </div>

                            {/* Image Link Input */}
                            <div className="flex flex-col gap-1 w-full sm:w-28 hidden xl:flex">
                              <label className="text-[10px] text-[#A1A1AA] font-medium text-right">رابط الصورة</label>
                              <input
                                type="text"
                                defaultValue={product.image}
                                onBlur={(e) => handleUpdateProductImage(product.id, e.target.value)}
                                placeholder="رابط URL..."
                                className="bg-[#18181B] border border-[#2E2E33] focus:border-[#D4AF37] text-[11px] text-white px-2 py-1.5 rounded-lg outline-hidden w-full"
                                title="رابط الصورة (اضغط خارج الحقل للحفظ)"
                              />
                            </div>

                            {/* Action Buttons: Edit Modal, Stock Toggle & Offer Toggle */}
                            <div className="flex items-center gap-1.5 w-full sm:w-auto pt-4 sm:pt-0">
                              <button
                                onClick={() => openEditProductModal(product)}
                                className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FFE58F] border border-[#3F3F46] px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
                                title="فتح نموذج تعديل المنتج الشامل والسعر"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>تعديل</span>
                              </button>

                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/30 px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
                                title="حذف هذا المنتج نهائياً من المتجر"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>حذف</span>
                              </button>

                              <button
                                onClick={() => handleToggleStock(product.id)}
                                className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                                  product.inStock !== false
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-600/50 hover:bg-rose-900'
                                }`}
                                title="تبديل حالة توفر المنتج"
                              >
                                <span>{product.inStock !== false ? '✅ متوفر' : '🚫 غير متوفر'}</span>
                              </button>

                              <button
                                onClick={() => handleToggleOffer(product.id)}
                                className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                                  product.isOffer || hasDiscount
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                                    : 'bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#3F3F46]'
                                }`}
                                title="تفعيل أو إلغاء وسم العروض والتخفيضات"
                              >
                                <span>{product.isOffer || hasDiscount ? '🔥 عرض' : '🏷️ إضافة كعرض'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <>
            {/* Filter Tabs & Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 bg-[#18181B] p-1 rounded-xl border border-[#2E2E33]">
                {[
                  { id: 'all', label: `الكل (${orders.length})` },
                  { id: 'received', label: `جديدة (${stats.received})` },
                  { id: 'preparing', label: `تجهيز (${stats.preparing})` },
                  { id: 'out_for_delivery', label: `مع المندوب (${stats.outForDelivery})` },
                  { id: 'delivered', label: `مكتملة (${stats.delivered})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-[#D4AF37] text-black font-bold'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الزبون، الرمز، أو الهاتف..."
                  className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#D4AF37] rounded-xl pl-3 pr-8 py-2 text-xs text-white placeholder-[#71717A] outline-hidden"
                />
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717A]" />
              </div>
            </div>

            {/* Orders Cards List */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#18181B] rounded-2xl border border-[#2E2E33]">
                <Package className="w-10 h-10 text-[#52525B] mx-auto" />
                <h3 className="text-base font-bold text-white">لا توجد طلبات في هذا القسم</h3>
                <p className="text-xs text-[#A1A1AA]">عند قيام أي زبون بتثبيت طلب جديد ستنطلق رنة التنبيه وتظهر تفاصيله هنا فوراً.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const isUpdating = updatingId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`bg-[#18181B] rounded-2xl border transition-all overflow-hidden ${
                        order.status === 'received'
                          ? 'border-amber-500/60 shadow-md shadow-amber-500/10'
                          : order.status === 'preparing'
                          ? 'border-blue-500/40'
                          : order.status === 'out_for_delivery'
                          ? 'border-purple-500/40'
                          : order.status === 'delivered'
                          ? 'border-emerald-500/40'
                          : 'border-[#2E2E33]'
                      }`}
                    >
                      {/* Order Card Header */}
                      <div className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#2E2E33]">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-base text-[#FFE58F] bg-black/40 px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                            #{order.trackingCode}
                          </span>

                          <div>
                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                              <span>{order.customer.name}</span>
                              <span className="text-[11px] text-[#A1A1AA] font-normal">
                                ({order.customer.governorate})
                              </span>
                            </h3>
                            <p className="text-[11px] text-[#71717A]">
                              {new Date(order.createdAt).toLocaleTimeString('ar-IQ', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border ${
                              order.status === 'received'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-600/50 animate-pulse'
                                : order.status === 'preparing'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-600/50'
                                : order.status === 'out_for_delivery'
                                ? 'bg-purple-950/60 text-purple-300 border-purple-600/50'
                                : order.status === 'delivered'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'
                                : 'bg-rose-950/60 text-rose-300 border-rose-600/50'
                            }`}
                          >
                            {order.status === 'received' && '🕒 استلام جديد'}
                            {order.status === 'preparing' && '📦 جاري التجهيز'}
                            {order.status === 'out_for_delivery' && '🛵 مع المندوب'}
                            {order.status === 'delivered' && '🎉 تم التوصيل'}
                            {order.status === 'cancelled' && '❌ ملغي'}
                          </span>

                          <span className="font-bold text-[#D4AF37] text-sm sm:text-base">
                            {formatIQD(order.total)}
                          </span>
                        </div>
                      </div>

                      {/* Order Details Body */}
                      <div className="p-4 sm:px-5 space-y-4">
                        {/* Quick Contact & Map Actions for Driver / Father */}
                        <div className="flex flex-wrap gap-2">
                          {/* Direct Call */}
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="inline-flex items-center gap-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white px-3 py-2 rounded-xl text-xs font-semibold border border-[#3F3F46] transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>اتصال ({order.customer.phone})</span>
                          </a>

                          {/* WhatsApp Chat */}
                          <a
                            href={`https://wa.me/964${order.customer.phone.replace(/^0+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-700/50 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>مراسلة واتساب</span>
                          </a>

                          {/* Live Chat Direct Button */}
                          <button
                            onClick={() => handleOpenChatFromToast(order.trackingCode)}
                            className="inline-flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#FFE58F] text-black px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                            title="فتح الشات المباشر مع هذا الزبون"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-black" />
                            <span>شات الزبون 💬</span>
                          </button>

                          {/* Quick WhatsApp Reply: Preparing */}
                          <button
                            onClick={() => handleSendQuickWhatsAppReply(order, 'preparing')}
                            className="inline-flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-900 text-emerald-300 px-2.5 py-2 rounded-xl text-[11px] font-medium border border-emerald-600/40 transition-colors cursor-pointer"
                            title="إرسال رسالة جاهزة للزبون: طلبك قيد التجهيز"
                          >
                            <span>💬 قيد التجهيز</span>
                          </button>

                          {/* Quick WhatsApp Reply: On The Way */}
                          <button
                            onClick={() => handleSendQuickWhatsAppReply(order, 'on_the_way')}
                            className="inline-flex items-center gap-1 bg-purple-900/40 hover:bg-purple-900 text-purple-300 px-2.5 py-2 rounded-xl text-[11px] font-medium border border-purple-600/40 transition-colors cursor-pointer"
                            title="إرسال رسالة جاهزة للزبون: المندوب بالطريق"
                          >
                            <span>🛵 بالطريق</span>
                          </button>

                          {/* GPS Google Maps Direct Button */}
                          {order.location ? (
                            <a
                              href={order.location.mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-black px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              <MapPin className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                              <span>فتح الموقع على الخريطة (GPS)</span>
                              <ExternalLink className="w-3 h-3 text-black" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-[#27272A] text-[#A1A1AA] px-3 py-2 rounded-xl text-xs border border-[#3F3F46]">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>الموقع: {order.customer.address}</span>
                            </span>
                          )}

                          {/* Copy Courier Summary */}
                          <button
                            onClick={() => handleCopyDispatchText(order)}
                            className="inline-flex items-center gap-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FFE58F] px-3 py-2 rounded-xl text-xs font-medium border border-[#3F3F46] transition-colors cursor-pointer mr-auto"
                            title="نسخ ملخص الطلب لإرساله للمندوب"
                          >
                            {copiedId === order.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>تم نسخ بيانات المندوب!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>نسخ للمندوب</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Customer Address & Delivery Preferences */}
                        <div className="bg-[#121214] p-3 rounded-xl border border-[#27272A] space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[#A1A1AA]">
                              <strong>العنوان: </strong> {order.customer.address} ({order.customer.governorate})
                            </span>
                            <span className="text-[#D4AF37] font-semibold bg-[#27272A] px-2 py-0.5 rounded-md">
                              موعد التوصيل: {order.deliveryTiming === 'today' ? 'اليوم' : order.deliveryTiming === 'tomorrow' ? 'غداً' : 'خلال هذا الأسبوع'} {order.customTimingText}
                            </span>
                          </div>

                          {order.customer.notes && (
                            <p className="text-amber-300 text-[11px] pt-1 border-t border-[#27272A]">
                              <strong>ملاحظة الزبون: </strong> {order.customer.notes}
                            </p>
                          )}
                        </div>

                        {/* Prominent Full-Screen Order Items View Button for Father */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-[#221B13] via-[#2A2016] to-[#221B13] p-3.5 rounded-xl border border-[#D4AF37]/50 shadow-md">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#FFE58F] text-lg font-bold">
                              🛍️
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-[#FFE58F]">
                                سلة منتجات الطلب ({order.items.reduce((acc, i) => acc + i.quantity, 0)} قطعة)
                              </h4>
                              <p className="text-xs text-[#D4D4D8]">
                                انقر لعرض كافة المنتجات بصور مكبرة وواضحة جداً لتجهيزها
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => setFullScreenOrderModal(order)}
                            className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap hover:scale-105"
                          >
                            <span>عرض كافة المنتجات بشاشة كاملة 🖼️</span>
                          </button>
                        </div>

                        {/* Ordered Items Preview & Toggle */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-xs text-[#A1A1AA] flex items-center gap-1.5">
                              <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>المنتجات المطلوبة ({order.items.reduce((acc, i) => acc + i.quantity, 0)} قطع):</span>
                            </h4>

                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض المنتجات'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="bg-[#121214] p-3 rounded-xl border border-[#27272A] space-y-2 text-xs">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedProductDetail({ product: item.product, quantity: item.quantity })}
                                  className="flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-white/5 border-b border-[#27272A] last:border-0 cursor-pointer transition-colors"
                                  title="انقر لعرض تفاصيل وصورة المنتج المكبرة"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {item.product.image ? (
                                      <img
                                        src={item.product.image}
                                        alt={item.product.name}
                                        className="w-12 h-12 rounded-lg object-cover border border-[#2E2E33] shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg bg-[#27272A] border border-[#2E2E33] shrink-0" />
                                    )}
                                    <div className="truncate">
                                      <p className="font-bold text-white truncate hover:text-[#FFE58F] transition-colors">{item.product.name}</p>
                                      <p className="text-[10px] text-[#A1A1AA]">
                                        الكمية: <strong className="text-amber-300">{item.quantity}</strong> × {formatIQD(item.product.price)} (انقر للتفاصيل 🔍)
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-bold text-[#FFE58F] shrink-0 font-mono">
                                    {formatIQD(item.product.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Driver Note Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="ملاحظات المندوب أو التجهيز (مثال: تم التجهيز، اسم المندوب: علي)..."
                            value={
                              driverNoteInput[order.id] !== undefined
                                ? driverNoteInput[order.id]
                                : order.driverNotes || ''
                            }
                            onChange={(e) =>
                              setDriverNoteInput({
                                ...driverNoteInput,
                                [order.id]: e.target.value,
                              })
                            }
                            className="flex-1 bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-white text-xs rounded-xl px-3 py-2 outline-hidden"
                          />
                        </div>

                        {/* Status Change Action Buttons (Sequential for the father) */}
                        <div className="pt-2 border-t border-[#2E2E33] flex flex-wrap items-center gap-2">
                          <span className="text-xs text-[#71717A] font-semibold">مراحل التوصيل:</span>

                          <button
                            onClick={() => handleStatusChange(order.id, 'preparing')}
                            disabled={isUpdating || order.status === 'preparing'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              order.status === 'preparing'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-[#27272A] hover:bg-[#3F3F46] text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            <span>📦 بدء التجهيز</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(order.id, 'out_for_delivery')}
                            disabled={isUpdating || order.status === 'out_for_delivery'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              order.status === 'out_for_delivery'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-[#27272A] hover:bg-[#3F3F46] text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            <span>🛵 تسليم للمندوب</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(order.id, 'delivered')}
                            disabled={isUpdating || order.status === 'delivered'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              order.status === 'delivered'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[#27272A] hover:bg-[#3F3F46] text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            <span>✅ تم التوصيل</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(order.id, 'received')}
                            disabled={isUpdating || order.status === 'received'}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              order.status === 'received'
                                ? 'bg-amber-500 text-black'
                                : 'bg-[#27272A] text-[#A1A1AA] hover:text-white'
                            }`}
                            title="إعادة إلى قيد الانتظار"
                          >
                            إرجاع للجديدة
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer mr-auto"
                            title="حذف الطلب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
        </div>
        )}
      </div>
    </div>

      {/* Full-Screen Order Items View Modal for Father */}
      {fullScreenOrderModal && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex items-center justify-center animate-fade-in">
          <div className="bg-[#18181B] text-white w-full max-w-4xl rounded-2xl border border-[#D4AF37]/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-6 bg-gradient-to-r from-[#1E1710] via-[#2A1E14] to-[#1E1710] border-b border-[#D4AF37]/30 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#D4AF37] text-black text-xs font-black px-2.5 py-0.5 rounded-full">
                    شاشة تجهيز الطلب بشاشة كاملة 🖼️
                  </span>
                  <span className="font-mono text-amber-300 font-bold text-base">
                    #{fullScreenOrderModal.trackingCode}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  الزبون: {fullScreenOrderModal.customer.name} | 📞 {fullScreenOrderModal.customer.phone}
                </h3>
                <p className="text-xs text-[#D4D4D8]">
                  العنوان: {fullScreenOrderModal.customer.governorate} - {fullScreenOrderModal.customer.address}
                </p>
              </div>

              <button
                onClick={() => setFullScreenOrderModal(null)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#FFE58F]">
                  قائمة المنتجات المطلوبة ({fullScreenOrderModal.items.reduce((acc, i) => acc + i.quantity, 0)} قطع) - انقر على أي منتج لعرض تفاصيله الكاملة:
                </h4>
                <span className="font-bold text-emerald-400 text-sm">
                  المجموع الكلي: {formatIQD(fullScreenOrderModal.total)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {fullScreenOrderModal.items.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedProductDetail({ product: item.product, quantity: item.quantity })}
                    className="bg-[#121214] p-4 rounded-2xl border border-[#2E2E33] hover:border-[#D4AF37] transition-all flex items-center gap-4 cursor-pointer group shadow-md"
                  >
                    {item.product.image ? (
                      <img
                        src={getProductImageUrl(item.product)}
                        alt={item.product.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain bg-white border border-[#3F3F46] shrink-0 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#27272A] border border-[#3F3F46] shrink-0 flex items-center justify-center text-xs text-[#A1A1AA]">
                        بدون صورة
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <span className="text-[10px] bg-[#C5A059]/20 text-[#FFE58F] px-2 py-0.5 rounded font-bold">
                        {item.product.brand}
                      </span>
                      <h5 className="font-bold text-sm sm:text-base text-white group-hover:text-[#FFE58F] transition-colors line-clamp-2">
                        {item.product.name}
                      </h5>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[#A1A1AA]">
                          الكمية: <strong className="text-white text-sm bg-[#27272A] px-2 py-0.5 rounded">{item.quantity}</strong>
                        </span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatIQD(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {fullScreenOrderModal.customer.notes && (
                <div className="bg-amber-950/40 border border-amber-600/50 p-4 rounded-xl text-xs text-amber-200 space-y-1">
                  <strong>ملاحظات الزبون الخاصة بهذا الطلب:</strong>
                  <p>{fullScreenOrderModal.customer.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:px-6 bg-[#121214] border-t border-[#2E2E33] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  handleCopyDispatchText(fullScreenOrderModal);
                  alert('تم نسخ تفاصيل الطلب للمندوب بنجاح!');
                }}
                className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FFE58F] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-[#D4AF37]" />
                <span>نسخ كشف الطلب للمندوب</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleStatusChange(fullScreenOrderModal.id, 'preparing');
                    setFullScreenOrderModal(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>تحديث إلى (جاري التجهيز) 📦</span>
                </button>

                <button
                  onClick={() => setFullScreenOrderModal(null)}
                  className="bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
                >
                  إغلاق شاشة العرض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Product Detail Modal */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-[#18181B] text-white w-full max-w-lg rounded-2xl border border-[#D4AF37]/50 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-[#1E1710] to-[#2A1E14] border-b border-[#D4AF37]/30 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-[#FFE58F]">تفاصيل المنتج المطلوب في الطلب</h4>
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="p-2 text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedProductDetail.product.image && (
                <div className="w-full h-56 rounded-xl bg-white overflow-hidden border border-[#2E2E33]">
                  <img
                    src={getProductImageUrl(selectedProductDetail.product)}
                    alt={selectedProductDetail.product.name}
                    className="w-full h-full object-contain p-2 bg-white"
                  />
                </div>
              )}

              <div className="space-y-2 text-right">
                <span className="bg-[#C5A059]/20 text-[#FFE58F] text-xs font-bold px-2.5 py-1 rounded-full border border-[#C5A059]/40">
                  {selectedProductDetail.product.brand}
                </span>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {selectedProductDetail.product.name}
                </h3>
                <div className="flex items-center justify-between bg-[#121214] p-3.5 rounded-xl border border-[#2E2E33]">
                  <span className="text-xs text-[#A1A1AA]">الكمية المطلوبة في هذا الطلب:</span>
                  <strong className="text-amber-300 font-mono text-base bg-amber-500/20 px-3 py-0.5 rounded-lg border border-amber-500/40">
                    {selectedProductDetail.quantity} قطعة
                  </strong>
                </div>
                <div className="flex items-center justify-between bg-[#121214] p-3.5 rounded-xl border border-[#2E2E33]">
                  <span className="text-xs text-[#A1A1AA]">سعر القطعة المفردة:</span>
                  <strong className="text-emerald-400 font-mono text-base">
                    {formatIQD(selectedProductDetail.product.price)}
                  </strong>
                </div>
                <div className="flex items-center justify-between bg-[#121214] p-3.5 rounded-xl border border-[#2E2E33]">
                  <span className="text-xs text-[#A1A1AA]">المجموع لهذا المنتج:</span>
                  <strong className="text-[#FFE58F] font-mono text-base font-extrabold">
                    {formatIQD(selectedProductDetail.product.price * selectedProductDetail.quantity)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#121214] border-t border-[#2E2E33] flex justify-end">
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="bg-[#D4AF37] hover:bg-[#FFE58F] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(editingProductModal || isAddingNewProductModal) && (
        <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#18181B] border border-[#C5A059]/40 w-full max-w-2xl rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-right relative my-8">
            <div className="flex items-center justify-between border-b border-[#2E2E33] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 flex items-center justify-center text-[#D4AF37]">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingProductModal ? 'تعديل بيانات وسعر المنتج 🏷️' : 'إضافة منتج جديد للمتجر ✨'}
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA]">
                    يمكنك تحديث السعر الأصلي، نسبة الخصم وسعر البيع، مع الحساب التلقائي اللحظي.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingProductModal(null);
                  setIsAddingNewProductModal(false);
                }}
                className="text-[#A1A1AA] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">اسم المنتج الفاخر *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="مثلاً: عطر Venesa الرجالي الفاخر"
                  className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-3 rounded-xl outline-hidden"
                />
              </div>

              {/* PRICE EDITING SECTION (Side-by-side: Original Price, Discount %, Selling Price) */}
              <div className="bg-[#121214] p-4 rounded-xl border border-[#27272A] space-y-3">
                <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                  <span className="text-xs font-bold text-[#FFE58F] flex items-center gap-1.5">
                    <span>💰</span>
                    <span>تعديل السعر والخصم المباشر</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-600/30">
                    حساب ومزامنة تلقائية
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. السعر الأصلي (د.ع) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#A1A1AA] flex items-center justify-between">
                      <span>السعر الأصلي (د.ع)</span>
                      <span className="text-[10px] text-[#71717A]">قبل الخصم</span>
                    </label>
                    <input
                      type="number"
                      value={productForm.originalPrice || ''}
                      onChange={(e) => handleFormOriginalPriceChange(e.target.value)}
                      placeholder="مثال: 12000"
                      className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-amber-300 font-bold p-2.5 rounded-xl outline-hidden text-center"
                    />
                  </div>

                  {/* 2. نسبة الخصم % (Placed right beside Original Price) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-rose-400 flex items-center justify-between">
                      <span>نسبة الخصم %</span>
                      <span className="text-[10px] text-rose-500">مباشر</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={productForm.discountPercent || ''}
                        onChange={(e) => handleFormDiscountPercentChange(e.target.value)}
                        placeholder="مثال: 20"
                        className="w-full bg-[#18181B] border border-rose-900/50 focus:border-rose-500 text-xs text-rose-300 font-bold p-2.5 rounded-xl outline-hidden text-center pl-7"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-rose-400 font-bold">%</span>
                    </div>
                  </div>

                  {/* 3. سعر البيع النهائي (د.ع) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                      <span>سعر البيع النهائي (د.ع)</span>
                      <span className="text-[10px] text-emerald-500">بعد الخصم</span>
                    </label>
                    <input
                      type="number"
                      value={productForm.price || ''}
                      onChange={(e) => handleFormSellingPriceChange(e.target.value)}
                      placeholder="مثال: 10000"
                      className="w-full bg-[#18181B] border border-emerald-900/50 focus:border-emerald-500 text-xs text-emerald-300 font-bold p-2.5 rounded-xl outline-hidden text-center"
                    />
                  </div>
                </div>

                {/* Pricing Live Preview */}
                <div className="bg-[#18181B] p-2.5 rounded-lg border border-[#2E2E33] flex items-center justify-between text-xs">
                  <span className="text-[#A1A1AA]">السعر كما سيظهر للزبائن:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatIQD(productForm.price || 0)}
                    </span>
                    {productForm.originalPrice && productForm.originalPrice > productForm.price && (
                      <>
                        <span className="text-[#71717A] line-through text-xs">
                          {formatIQD(productForm.originalPrice)}
                        </span>
                        <span className="bg-rose-950/80 text-rose-300 border border-rose-600/40 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          وفرت {formatIQD(productForm.originalPrice - productForm.price)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">التصنيف الرئيسي</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-xl outline-hidden cursor-pointer"
                  >
                    {adminCategories.filter(c => c.id !== 'all' && c.id !== 'bestsellers' && c.id !== 'offers').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">التصنيف الفرعي</label>
                  <select
                    value={productForm.subCategory}
                    onChange={(e) => setProductForm({ ...productForm, subCategory: e.target.value })}
                    className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-xl outline-hidden cursor-pointer"
                  >
                    <option value="">بدون تصنيف فرعي</option>
                    {(adminCategories.find(c => c.id === productForm.category)?.subCategories || [])
                      .filter(s => s.id !== 'all')
                      .map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Image Input */}
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">صورة المنتج</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    placeholder="اسم الصورة مثل (7 الاف.jpg) أو رابط..."
                    className="flex-1 bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-xl outline-hidden"
                  />
                  <label className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer transition-colors border border-[#3F3F46]">
                    <span>رفع صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setProductForm({ ...productForm, image: ev.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">وصف المنتج</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="وصف مختصر للمنتج..."
                  className="w-full bg-[#121214] border border-[#2E2E33] focus:border-[#D4AF37] text-xs text-white p-2.5 rounded-xl outline-hidden resize-none"
                />
              </div>

              {/* Status Toggles */}
              <div className="flex flex-wrap items-center gap-4 bg-[#121214] p-3 rounded-xl border border-[#27272A]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) => setProductForm({ ...productForm, inStock: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span>متوفر في المخزن (In Stock)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={productForm.isBestSeller}
                    onChange={(e) => setProductForm({ ...productForm, isBestSeller: e.target.checked })}
                    className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                  />
                  <span>الأكثر مبيعاً ⭐</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2E2E33]">
              <button
                onClick={() => {
                  setEditingProductModal(null);
                  setIsAddingNewProductModal(false);
                }}
                className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveProductForm}
                className="bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:brightness-110 text-black text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>حفظ وتطبيق السعر فوراً ✨</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

