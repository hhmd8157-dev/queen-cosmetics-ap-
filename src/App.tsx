import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { QuickPeekModal } from './components/QuickPeekModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { TrustSection } from './components/TrustSection';
import { CustomBakhoorMixer } from './components/CustomBakhoorMixer';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { LiveOrderTrackerModal } from './components/LiveOrderTrackerModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { StockNotifyModal } from './components/StockNotifyModal';
import { OrderStatusPushToast, PushStatusNotification } from './components/OrderStatusPushToast';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { PRODUCTS, STORE_INFO, formatIQD, getStoredProducts, CATEGORIES, getStoredCategories } from './data/products';
import { subscribeToProductsRealtime } from './services/productsFirestoreService';
import { CartItem, CategoryId, Product, OrderStatus } from './types';
import { Sparkles, MessageCircle, ArrowLeft, Heart, ShoppingBag, Check, Bike, ClipboardList, Sun, Moon, BellRing } from 'lucide-react';
import { ThemeMode, getInitialTheme, toggleThemeMode, applyTheme } from './utils/theme';
import { playStatusNotificationSound, getOrdersBroadcastChannel } from './utils/alerts';

export default function App() {
  // Theme mode persisted state
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // Apply theme on load and sync
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen to system theme changes or storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'queen_theme_mode' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = toggleThemeMode(prev);
      return next;
    });
    showToast(theme === 'light' ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️', 'info');
  };

  // Local storage persisted cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('queen_cosmetics_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Local storage persisted wishlist
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('queen_cosmetics_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('queen_product_view_mode');
      return saved === 'list' || saved === 'grid' ? saved : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('queen_product_view_mode', mode);
    } catch {}
    showToast(mode === 'list' ? 'تم تفعيل العرض بنمط القائمة 📋' : 'تم تفعيل العرض بنمط الشبكة 🔲', 'info');
  };

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickPeekProduct, setQuickPeekProduct] = useState<Product | null>(null);
  const [stockAlertProduct, setStockAlertProduct] = useState<Product | null>(null);
  const [isStockAlertModalOpen, setIsStockAlertModalOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  
  // Tracking & Admin Modals
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [activeTrackingCode, setActiveTrackingCode] = useState<string>('');
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    return window.location.pathname === '/admin' || window.location.hash === '#admin';
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' } | null>(null);
  
  // Real-time Push Status Notification state
  const [pushNotification, setPushNotification] = useState<PushStatusNotification | null>(null);

  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Real-time Order Status Listener (SSE + Cross-Tab Broadcast + Window Custom Events)
  useEffect(() => {
    const handleStatusPayload = (payload: any) => {
      if (!payload || !payload.newStatus && !payload.status) return;

      const newStatus = (payload.newStatus || payload.status) as OrderStatus;
      const orderId = payload.orderId || payload.order?.id || 'ORD';
      const trackingCode = payload.trackingCode || payload.order?.trackingCode || '0000';
      const customerName = payload.customerName || payload.order?.customer?.name;
      const driverNotes = payload.driverNotes || payload.order?.driverNotes;

      // Auditory Feedback based on status
      playStatusNotificationSound(newStatus);

      // Light Haptic feedback on mobile if supported
      try {
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch {}

      // Trigger Push Notification Toast
      setPushNotification({
        id: `${orderId}-${Date.now()}`,
        orderId,
        trackingCode,
        previousStatus: payload.previousStatus,
        newStatus,
        customerName,
        driverNotes,
        timestamp: Date.now(),
      });
    };

    // 1. Window CustomEvent listener
    const onWindowStatusChange = (e: any) => {
      if (e.detail) {
        handleStatusPayload(e.detail);
      }
    };
    window.addEventListener('queen_order_status_change', onWindowStatusChange);

    // 2. BroadcastChannel cross-tab listener
    const channel = getOrdersBroadcastChannel();
    const onChannelMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ORDER_STATUS_CHANGED') {
        handleStatusPayload(e.data.payload);
      }
    };
    if (channel) {
      channel.addEventListener('message', onChannelMessage);
    }

    // 3. Server-Sent Events (SSE) stream for cross-device updates (e.g. from father's phone)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/orders/events');
      eventSource.addEventListener('ORDER_STATUS_CHANGED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          handleStatusPayload(parsed);
        } catch (err) {
          console.error('Failed to parse SSE event data', err);
        }
      });
    } catch (err) {
      console.warn('SSE not supported or failed to connect:', err);
    }

    return () => {
      window.removeEventListener('queen_order_status_change', onWindowStatusChange);
      if (channel) {
        channel.removeEventListener('message', onChannelMessage);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Auto-open live tracking modal on app load if active_order exists in localStorage
  useEffect(() => {
    try {
      const savedActiveOrder = localStorage.getItem('active_order');
      if (savedActiveOrder) {
        const parsed = JSON.parse(savedActiveOrder);
        const code = parsed?.trackingCode || parsed?.id;
        if (code) {
          setActiveTrackingCode(code);
          setIsTrackerOpen(true);
        }
      }
    } catch (e) {
      console.error('Failed to restore active_order on mount:', e);
    }
  }, []);

  const handleClearActiveOrder = () => {
    try {
      localStorage.removeItem('active_order');
      localStorage.removeItem('queen_last_order_code');
    } catch (e) {
      console.error(e);
    }
    setActiveTrackingCode('');
    setIsTrackerOpen(false);
    showToast('تمت إزالة التتبع بنجاح. يمكنك الآن تصفح المتجر وإجراء طلب جديد 🛍️', 'info');
  };
  // URL route check for /admin
  useEffect(() => {
    const handleHashOrPathChange = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('popstate', handleHashOrPathChange);
    window.addEventListener('hashchange', handleHashOrPathChange);
    return () => {
      window.removeEventListener('popstate', handleHashOrPathChange);
      window.removeEventListener('hashchange', handleHashOrPathChange);
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('queen_cosmetics_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('queen_cosmetics_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error(e);
    }
  }, [wishlist]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast(`تمت إضافة "${product.name}" إلى السلة 🛍️`);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('تمت إزالة المنتج من السلة', 'info');
  };

  const handleClearCart = () => {
    setCart([]);
    showToast('تم تفريغ السلة بالكامل', 'info');
  };

  // When order is successfully placed directly in app
  const handleOrderPlaced = (trackingCode: string, orderData?: any) => {
    if (orderData) {
      try {
        localStorage.setItem('active_order', JSON.stringify(orderData));
        localStorage.setItem('queen_last_order_code', trackingCode);
      } catch (e) {
        console.error(e);
      }
    }
    setActiveTrackingCode(trackingCode);
    setIsTrackerOpen(true);
    showToast(`تم تثبيت طلبك بنجاح! رقم التتبع: #${trackingCode} 🎉`, 'success');
  };

  // Wishlist operations
  const handleToggleWishlist = (product: Product) => {
    const exists = wishlist.some((p) => p.id === product.id);
    if (exists) {
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`تمت إزالة "${product.name}" من المفضلة`, 'info');
    } else {
      setWishlist((prev) => [...prev, product]);
      showToast(`تمت إضافة "${product.name}" إلى المفضلة ❤️`);
    }
  };

  const handleClearWishlist = () => {
    setWishlist([]);
    showToast('تم مسح قائمة المفضلة', 'info');
  };

  const [productsList, setProductsList] = useState<Product[]>(() => getStoredProducts());
  const [categories, setCategories] = useState(() => getStoredCategories());

  useEffect(() => {
    // 1. Subscribe to real-time Firestore cloud database updates
    const unsubscribe = subscribeToProductsRealtime((updatedProducts) => {
      if (updatedProducts && updatedProducts.length > 0) {
        setProductsList(updatedProducts);
      }
    });

    // 2. Also listen for fast local storage updates
    const handleLocalUpdate = () => {
      setProductsList(getStoredProducts());
    };
    window.addEventListener('queen_products_updated', handleLocalUpdate);

    const handleCategoriesUpdate = () => {
      setCategories(getStoredCategories());
    };
    window.addEventListener('queen_categories_updated', handleCategoriesUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('queen_products_updated', handleLocalUpdate);
      window.removeEventListener('queen_categories_updated', handleCategoriesUpdate);
    };
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: productsList.length,
      bestsellers: productsList.filter((p) => p.isBestSeller).length,
      offers: productsList.filter((p) => p.isOffer || p.originalPrice).length,
    };
    categories.forEach((cat) => {
      if (cat.id !== 'all' && cat.id !== 'bestsellers' && cat.id !== 'offers') {
        counts[cat.id] = 0;
      }
    });
    productsList.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [productsList, categories]);

  // Sub-category counts for the active category
  const subCategoryCounts = useMemo(() => {
    const currentCategoryData = categories.find((c) => c.id === selectedCategory);
    if (!currentCategoryData?.subCategories) return {};

    const counts: Record<string, number> = {};
    currentCategoryData.subCategories.forEach((sc) => {
      if (sc.id === 'all') {
        counts['all'] = categoryCounts[selectedCategory] || 0;
      } else {
        if (selectedCategory === 'offers') {
          counts[sc.id] = productsList.filter((p) => (p.isOffer || p.originalPrice) && p.category === sc.id).length;
        } else {
          counts[sc.id] = productsList.filter((p) => p.category === selectedCategory && p.subCategory === sc.id).length;
        }
      }
    });
    return counts;
  }, [selectedCategory, productsList, categoryCounts, categories]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      // Category filter
      if (selectedCategory === 'bestsellers') {
        if (!product.isBestSeller) return false;
      } else if (selectedCategory === 'offers') {
        if (!product.isOffer && !product.originalPrice) return false;
      } else if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Sub-category filter
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        if (selectedCategory === 'offers') {
          if (product.category !== selectedSubCategory) return false;
        } else {
          if (product.subCategory !== selectedSubCategory) return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = product.name.toLowerCase().includes(q);
        const matchEnName = product.enName?.toLowerCase().includes(q);
        const matchBrand = product.brand ? product.brand.toLowerCase().includes(q) : false;
        const matchDesc = product.description ? product.description.toLowerCase().includes(q) : false;
        const matchTags = Array.isArray(product.tags) ? product.tags.some((t) => t.toLowerCase().includes(q)) : false;

        if (!matchName && !matchEnName && !matchBrand && !matchDesc && !matchTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      // Default: featured (bestseller first, then new)
      if (a.isBestSeller && !b.isBestSeller) return -1;
      if (!a.isBestSeller && b.isBestSeller) return 1;
      return 0;
    });
  }, [productsList, selectedCategory, selectedSubCategory, searchQuery, sortBy]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const scrollToProducts = () => {
    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenStockAlert = (product: Product) => {
    setStockAlertProduct(product);
    setIsStockAlertModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#0D0D10] text-[#1A1A1A] dark:text-[#F4F4F5] font-['Cairo',sans-serif] transition-colors duration-200">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] dark:bg-[#1E1E24] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-toast-pop border border-[#333333] dark:border-[#3A3A45] pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
            <Check className="w-3 h-3" />
          </div>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main App Navigation Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={totalCartCount}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenTracker={() => setIsTrackerOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Hero Presentation Banner */}
      <HeroBanner onExploreClick={scrollToProducts} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8" ref={productsSectionRef}>
        
        {/* Promotional & Direct Ordering Feature Banner */}
        <div className="bg-gradient-to-r from-[#18181B] to-[#25252A] dark:from-[#141418] dark:to-[#1C1C22] rounded-2xl p-4 sm:p-6 border border-[#2E2E33] dark:border-[#2E2E38] shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center md:text-right">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0 text-[#FFE58F]">
              <Bike className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  نظام التوصيل والطلب المباشر مع التتبع الحي 📍
                </h3>
                <span className="bg-[#D4AF37] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                  جديد
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] font-normal mt-0.5">
                اطلب مباشرة من السلة بدون تحويل، حدد موقعك بدقة GPS، وتابع خط سير مندوبك لحظة بلحظة برمز التتبع!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105"
            >
              <Bike className="w-4 h-4" />
              <span>تتبع طلب سابق</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all border border-white/20 cursor-pointer"
            >
              <span>فتح السلة والطلب</span>
            </button>
          </div>
        </div>

        {/* Categories & Sorting Filters */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id);
            setSelectedSubCategory('all');
            setSearchQuery('');
          }}
          selectedSubCategory={selectedSubCategory}
          onSelectSubCategory={setSelectedSubCategory}
          subCategoryCounts={subCategoryCounts}
          sortBy={sortBy}
          onSortChange={setSortBy}
          categoryCounts={categoryCounts}
          totalProductsCount={filteredProducts.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {/* Quick Peek Long Press Feature Tip */}
        <div className="bg-[#FAF8F5] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#282832] p-2.5 px-4 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-[#1A1A1A] dark:text-[#E4E4E7]">
            <span className="w-6 h-6 rounded-lg bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center font-bold shrink-0">
              ⚡
            </span>
            <span>
              <strong>تصفح سريع:</strong> اضغط مطولاً على صورة أي منتج للمعاينة الخاطفة وإضافته مباشرة للسلة!
            </span>
          </div>
          <span className="text-[10px] bg-[#C5A059] text-black font-extrabold px-2 py-0.5 rounded-full shrink-0">
            ميزة جديدة ✨
          </span>
        </div>

        {/* Active Filters / Search Query display */}
        {searchQuery && (
          <div className="flex items-center justify-between bg-white dark:bg-[#141418] border border-[#EAEAEA] dark:border-[#27272A] p-3 px-4 rounded-xl text-xs sm:text-sm shadow-xs">
            <span className="text-[#1A1A1A] dark:text-[#E4E4E7]">
              نتائج البحث عن: <strong className="text-[#C5A059] dark:text-[#FFE58F]">"{searchQuery}"</strong> ({filteredProducts.length} منتج)
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#999999] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white font-semibold underline cursor-pointer"
            >
              مسح البحث
            </button>
          </div>
        )}

        {/* Special Banner for Offers Category */}
        {selectedCategory === 'offers' && (
          <div className="bg-gradient-to-r from-[#18181B] via-[#2A2A30] to-[#18181B] rounded-2xl p-6 sm:p-8 border border-[#D4AF37]/40 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-4 text-right">
              <div className="w-14 h-14 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-2xl flex items-center justify-center shrink-0 text-2xl shadow-inner">
                🏷️
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#D4AF37] text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    تخفيضات حصرية
                  </span>
                  <span className="text-xs text-[#E4E4E7] font-semibold">
                    وفر أكثر مع عروض كوزمتك الملكة
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  أقوى الخصومات والتخفيضات على المنتجات المختارة 🔥
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  جميع المنتجات المتاحة أدناه تحتوي على خصومات مباشرة وتخفيضات في السعر
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Special Featured Banner for Mixtures Category */}
        {selectedCategory === 'mixtures' && (
          <div className="bg-gradient-to-r from-[#1C140E] via-[#2A1D13] to-[#1C140E] rounded-2xl p-6 sm:p-8 border border-[#C5A059]/40 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-4 text-right">
              <div className="w-14 h-14 bg-[#C5A059]/20 border border-[#C5A059]/50 rounded-2xl flex items-center justify-center shrink-0 text-2xl shadow-inner">
                🪵
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#C5A059] text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    قسم خلطات البخور والعطور
                  </span>
                  <span className="text-xs text-[#E4E4E7] font-semibold">
                    المبخرة التفاعلية والعلبة الذهبية 👑
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  خلطات البخور والعطور الملكية الحصرية ✨
                </h2>
                <p className="text-xs text-[#D4D4D8]">
                  تم تخصيص هذا القسم لخلطات البخور والعطور الفاخرة، مع إمكانية ابتكار خلطتك الخاصة بالمبخرة والعلبة التفاعلية
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const mixerEl = document.getElementById('custom-bakhoor-section') || document.getElementById('custom-bakhoor-mixer-section');
                mixerEl?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#C5A059] hover:bg-[#D4AF37] text-black font-extrabold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md hover:scale-105 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>تركيب خلطة بخور ملكية</span>
            </button>
          </div>
        )}

        {/* Product Grid or Empty State */}
        {filteredProducts.length === 0 ? (
          selectedCategory === 'mixtures' ? (
            <div className="bg-gradient-to-b from-[#1C140E] via-[#241A13] to-[#18181B] rounded-2xl border border-[#C5A059]/40 p-8 sm:p-12 text-center space-y-5 max-w-lg mx-auto my-8 shadow-xl text-white">
              <div className="w-16 h-16 bg-[#C5A059]/20 border border-[#C5A059]/50 text-[#FFE58F] rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
                🪵
              </div>
              <div className="space-y-2">
                <span className="inline-block bg-[#C5A059]/20 text-[#FFE58F] text-xs font-bold px-3.5 py-1 rounded-full border border-[#C5A059]/40">
                  قسم خلطات البخور الملكية
                </span>
                <h3 className="font-extrabold text-[#FFE58F] text-lg sm:text-xl leading-relaxed">
                  قريباً.. أرقى خلطات البخور الملكية الخاصة 🪵✨
                </h3>
                <p className="text-xs text-[#D4D4D8] leading-relaxed max-w-md mx-auto">
                  تم تخصيص هذا القسم حصرياً لخلطات البخور والعطور الفاخرة. يمكنك الآن استخدام واجهة المبخرة والعلبة التفاعلية لتركيب وتخصيص خلطتك الملكية الفريدة مباشرة!
                </p>
              </div>
              <button
                onClick={() => {
                  const mixerEl = document.getElementById('custom-bakhoor-section') || document.getElementById('custom-bakhoor-mixer-section');
                  mixerEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs font-black px-6 py-3 rounded-xl hover:scale-105 transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>الانتقال لمختبر تركيب الخلطات الملكية</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E4E4E7] p-12 text-center space-y-4 max-w-md mx-auto my-8 shadow-xs">
              <div className="w-14 h-14 bg-[#F4F4F5] border border-[#E4E4E7] text-[#71717A] rounded-2xl flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#18181B] text-base">لم يتم العثور على منتجات في هذا القسم</h3>
                <p className="text-xs text-[#71717A]">
                  جرّب تصفح باقي الأقسام أو استخدام شريط البحث.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('bestsellers');
                  setSearchQuery('');
                }}
                className="bg-[#18181B] text-[#FFE58F] border border-[#D4AF37] text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#27272A] transition-all cursor-pointer shadow-xs"
              >
                العودة إلى الأكثر مبيعاً
              </button>
            </div>
          )
        ) : (
          <div 
            id="products-display-container"
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'
                : 'flex flex-col gap-3.5 sm:gap-4'
            }
          >
            {filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.product.id === product.id);
              const isInWishlist = wishlist.some((p) => p.id === product.id);

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  isInWishlist={isInWishlist}
                  onToggleWishlist={handleToggleWishlist}
                  cartQuantity={cartItem ? cartItem.quantity : 0}
                  onAddToCart={handleAddToCart}
                  onUpdateCartQuantity={handleUpdateCartQuantity}
                  onQuickView={(p) => setQuickViewProduct(p)}
                  onQuickPeek={(p) => setQuickPeekProduct(p)}
                  onRequestStockAlert={handleOpenStockAlert}
                  viewMode={viewMode}
                />
              );
            })}
          </div>
        )}

      </main>

      {/* Custom Interactive Bakhoor Mixture Section */}
      <CustomBakhoorMixer onAddToCart={handleAddToCart} />

      {/* Trust & Guarantee Section */}
      <TrustSection />

      {/* Footer */}
      <Footer 
        onSelectCategory={setSelectedCategory} 
        onOpenTracker={() => setIsTrackerOpen(true)}
      />

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsApp />

      {/* Real-time All-in-One AI Beauty & Shopping Assistant Widget */}
      <AiAssistantWidget />

      {/* Shopping Cart & Direct In-App Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onExplore={() => {
          setIsCartOpen(false);
          scrollToProducts();
        }}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onClearWishlist={handleClearWishlist}
        onExplore={() => {
          setIsWishlistOpen(false);
          scrollToProducts();
        }}
      />

      {/* Quick Peek Preview Modal (تصفح سريع عند الضغط المطول) */}
      <QuickPeekModal
        product={quickPeekProduct}
        onClose={() => setQuickPeekProduct(null)}
        isInWishlist={quickPeekProduct ? wishlist.some((p) => p.id === quickPeekProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onOpenFullModal={(p) => {
          setQuickPeekProduct(null);
          setQuickViewProduct(p);
        }}
        onRequestStockAlert={handleOpenStockAlert}
        cartQuantity={quickPeekProduct ? (cart.find((i) => i.product.id === quickPeekProduct.id)?.quantity || 0) : 0}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        isInWishlist={quickViewProduct ? wishlist.some((p) => p.id === quickViewProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onRequestStockAlert={handleOpenStockAlert}
      />

      {/* Stock Availability Notification Modal */}
      <StockNotifyModal
        product={stockAlertProduct}
        isOpen={isStockAlertModalOpen}
        onClose={() => {
          setIsStockAlertModalOpen(false);
          setStockAlertProduct(null);
        }}
        onSuccess={(msg) => {
          showToast(msg, 'success');
        }}
      />

      {/* Live Order Status Push Notification Toast */}
      <OrderStatusPushToast
        notification={pushNotification}
        onClose={() => setPushNotification(null)}
        onOpenTracker={(code) => {
          setActiveTrackingCode(code);
          setIsTrackerOpen(true);
        }}
      />

      {/* Live Customer Order Tracker Modal */}
      <LiveOrderTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        initialTrackingCode={activeTrackingCode}
        onClearActiveOrder={handleClearActiveOrder}
      />

      {/* Father's Admin Delivery & Orders Management Dashboard Modal (Hidden route /admin or #admin) */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
            window.history.replaceState(null, '', '/');
          }
        }}
      />
    </div>
  );
}
