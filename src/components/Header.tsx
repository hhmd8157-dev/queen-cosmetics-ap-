import React, { useState, useRef, useEffect } from 'react';
import { 
  Crown, 
  ShoppingBag, 
  Heart, 
  Search, 
  Sparkles,
  MessageCircle,
  Truck,
  ShieldCheck,
  Bot,
  Bike,
  ShieldAlert,
  Moon,
  Sun
} from 'lucide-react';
import { STORE_INFO, formatIQD } from '../data/products';
import { ThemeMode } from '../utils/theme';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenTracker: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenTracker,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const prevCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => {
        setIsCartBouncing(false);
      }, 700);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#121214] border-b border-[#EAEAEA] dark:border-[#27272A] transition-colors duration-200">
      {/* Top promotional announcement bar */}
      <div className="bg-[#1A1A1A] dark:bg-[#0A0A0C] text-stone-300 text-xs sm:text-sm py-2.5 px-4 font-medium border-b border-[#2A2A2A] dark:border-[#1E1E22]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#C5A059] text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
              <Truck className="w-3 h-3" />
              <span>توصيل سريع</span>
            </span>
            <span className="text-stone-200 font-medium text-xs sm:text-sm">
              التوصيل داخل مركز البصرة 3,000 د.ع | الأقضية والمحافظات 5,000 د.ع | مجاني للطلبات فوق 50,000 د.ع
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Live Order Tracking quick link */}
            <button
              onClick={onOpenTracker}
              className="flex items-center gap-1.5 text-[#FFE58F] hover:text-white bg-[#C5A059]/20 hover:bg-[#C5A059]/30 border border-[#C5A059]/40 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
            >
              <Bike className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-bold">تتبع شحنتك</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#EAEAEA] dark:border-[#2E2E33] flex items-center justify-center text-[#C5A059] shadow-xs">
              <Crown className="w-5 h-5 stroke-[2]" />
            </div>

            <div>
              <h1 className="text-xl sm:text-[26px] font-bold text-[#C5A059] tracking-tight font-serif">
                كوزمتك الملكة
              </h1>
              <p className="text-[9px] sm:text-[11px] text-[#999999] dark:text-[#A1A1AA] font-medium tracking-wider">
                QUEEN COSMETICS
              </p>
            </div>
          </div>

          {/* Search Bar - Center */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                id="search-input-header"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن منتج، عطر، لوشن، بخور..."
                className="w-full pl-4 pr-10 py-2.5 bg-[#F2F2F2] dark:bg-[#1A1A1E] hover:bg-[#EAEAEA]/60 dark:hover:bg-[#222228] focus:bg-white dark:focus:bg-[#1A1A1E] border border-transparent focus:border-[#C5A059] dark:focus:border-[#D4AF37] rounded-full text-xs sm:text-sm text-[#1A1A1A] dark:text-[#F4F4F5] placeholder-[#888888] dark:placeholder-[#71717A] outline-hidden transition-all duration-200"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] dark:text-[#71717A]" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#999999] hover:text-[#1A1A1A] dark:hover:text-white bg-[#EAEAEA] dark:bg-[#2A2A30] rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Actions & Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Theme Toggle Button */}
            <button
              id="header-theme-toggle-btn"
              onClick={onToggleTheme}
              className="relative p-2.5 rounded-full text-[#1A1A1A] dark:text-[#FFE58F] bg-[#FAFAFA] dark:bg-[#1E1E24] hover:bg-[#F0F0F0] dark:hover:bg-[#2A2A32] border border-[#EAEAEA] dark:border-[#33333C] transition-all cursor-pointer shadow-2xs hover:scale-105"
              title={isDark ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
              aria-label={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#FFE58F] animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-[#4B5563]" />
              )}
            </button>

            {/* Live Tracking Button */}
            <button
              id="header-tracker-btn"
              onClick={onOpenTracker}
              className="flex items-center gap-1.5 bg-[#FAFAFA] dark:bg-[#18181B] hover:bg-[#F0F0F0] dark:hover:bg-[#222228] text-[#1A1A1A] dark:text-white border border-[#EAEAEA] dark:border-[#2E2E33] px-3 sm:px-3.5 py-2 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer hover:border-[#C5A059]"
              title="تتبع الطلب بالرمز الموحد"
            >
              <Bike className="w-4 h-4 text-[#C5A059]" />
              <span className="hidden sm:inline">تتبع الطلب</span>
            </button>

            {/* AI Advisor Quick Button */}
            <button
              id="header-ai-advisor-btn"
              onClick={() => {
                const btn = document.getElementById('ai-assistant-toggle-btn');
                btn?.click();
              }}
              className="hidden lg:flex items-center gap-1.5 bg-[#18181B] hover:bg-[#25252A] text-[#FFE58F] border border-[#D4AF37]/50 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
              title="استشارة مستشار الجمال الذكي"
            >
              <Bot className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>مستشار الملكة 🤖</span>
            </button>

            {/* Wishlist Button */}
            <button
              id="header-wishlist-btn"
              onClick={onOpenWishlist}
              className="relative p-2.5 text-[#1A1A1A] dark:text-[#E4E4E7] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#F5F5F5] dark:hover:bg-[#1E1E24] rounded-full transition-colors cursor-pointer"
              title="قائمة المفضلة"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#C5A059] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              className={`relative flex items-center gap-2 bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black px-3.5 sm:px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer group shadow-sm ${
                isCartBouncing
                  ? 'animate-cart-bounce ring-4 ring-[#C5A059]/40 dark:ring-[#FFE58F]/50 shadow-md scale-105'
                  : 'hover:scale-102'
              }`}
              title="سلة المشتريات وتثبيت الطلب"
            >
              <div className="relative">
                <ShoppingBag className={`w-4 h-4 text-white dark:text-black transition-transform ${isCartBouncing ? 'rotate-[-12deg]' : ''}`} />
                {cartCount > 0 && (
                  <span className={`absolute -top-2 -right-2 w-4 h-4 bg-[#C5A059] dark:bg-black text-black dark:text-white text-[10px] font-bold rounded-full flex items-center justify-center ${
                    isCartBouncing ? 'animate-badge-pop ring-2 ring-white dark:ring-[#C5A059]' : ''
                  }`}>
                    {cartCount}
                  </span>
                )}
              </div>
              <span>السلة</span>
            </button>
          </div>
        </div>

        {/* Mobile Search input & Theme bar */}
        <div className="md:hidden pb-3 flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              id="search-input-mobile"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن منتج..."
              className="w-full pl-4 pr-10 py-2 bg-[#F2F2F2] dark:bg-[#1A1A1E] focus:bg-white dark:focus:bg-[#1A1A1E] border border-transparent focus:border-[#C5A059] dark:focus:border-[#D4AF37] rounded-full text-xs text-[#1A1A1A] dark:text-white placeholder-[#888888] dark:placeholder-[#71717A] outline-hidden"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] dark:text-[#71717A]" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#999999] bg-[#EAEAEA] dark:bg-[#2A2A30] rounded-full w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

