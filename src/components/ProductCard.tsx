import React from 'react';
import { 
  Heart, 
  ShoppingBag, 
  MessageCircle, 
  Star, 
  Eye, 
  Plus, 
  Minus, 
  Check, 
  Sparkles,
  ShieldCheck,
  BellRing
} from 'lucide-react';
import { Product } from '../types';
import { formatIQD } from '../data/products';
import { generateSingleProductWhatsAppUrl } from '../utils/whatsapp';
import { getProductDynamicRating } from '../data/reviews';
import { getProductImageUrl, getImageSrc } from '../utils/image';

interface ProductCardProps {
  product: Product;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onQuickView: (product: Product) => void;
  onQuickPeek?: (product: Product) => void;
  onRequestStockAlert?: (product: Product) => void;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isInWishlist,
  onToggleWishlist,
  cartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
  onQuickView,
  onQuickPeek,
  onRequestStockAlert,
  viewMode = 'grid',
}) => {
  const [imgError, setImgError] = React.useState<boolean>(false);
  const [isBouncing, setIsBouncing] = React.useState<boolean>(false);
  const [ratingStats, setRatingStats] = React.useState(() => getProductDynamicRating(product.id, product.rating));
  const isOutOfStock = product.inStock === false || product.stockCount === 0;

  // Long press gesture handling for Quick Peek (تصفح سريع)
  const [isHolding, setIsHolding] = React.useState<boolean>(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = React.useRef<boolean>(false);
  const startPosRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const startPress = (x: number, y: number) => {
    isLongPressRef.current = false;
    startPosRef.current = { x, y };

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHolding(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      if (onQuickPeek) {
        onQuickPeek(product);
      } else {
        onQuickView(product);
      }
      setTimeout(() => setIsHolding(false), 600);
    }, 380); // 380ms long press threshold
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startPress(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && timerRef.current) {
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) { // User is scrolling
        cancelPress();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
    }
    cancelPress();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startPress(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    cancelPress();
  };

  const handleMouseLeave = () => {
    cancelPress();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.stopPropagation();
      e.preventDefault();
      isLongPressRef.current = false;
      return;
    }
    onQuickView(product);
  };

  // Listen for review events to update star rating in real-time
  React.useEffect(() => {
    setRatingStats(getProductDynamicRating(product.id, product.rating));

    const handleReviewAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId: string }>;
      if (!customEvent.detail || customEvent.detail.productId === product.id) {
        setRatingStats(getProductDynamicRating(product.id, product.rating));
      }
    };

    window.addEventListener('queen_product_review_added', handleReviewAdded);
    window.addEventListener('queen_reviews_synced', handleReviewAdded);
    return () => {
      window.removeEventListener('queen_product_review_added', handleReviewAdded);
      window.removeEventListener('queen_reviews_synced', handleReviewAdded);
    };
  }, [product.id, product.rating]);

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAdd = () => {
    if (isOutOfStock) {
      if (onRequestStockAlert) onRequestStockAlert(product);
      return;
    }
    setIsBouncing(true);
    onAddToCart(product);
    setTimeout(() => setIsBouncing(false), 600);
  };

  const handleWhatsAppDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateSingleProductWhatsAppUrl(product, 1);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (viewMode === 'list') {
    return (
      <div
        id={`product-card-list-${product.id}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`group bg-white dark:bg-[#141418] rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row gap-4 p-3.5 sm:p-4 relative select-none overflow-hidden ${
          isHolding
            ? 'ring-2 ring-[#C5A059] scale-[0.99] border-[#C5A059] shadow-xl'
            : isOutOfStock
              ? 'border-[#EAEAEA] dark:border-[#27272A] opacity-90'
              : 'border-[#EAEAEA] dark:border-[#27272A] hover:border-[#C5A059]/50 dark:hover:border-[#D4AF37]/50 shadow-xs hover:shadow-md'
        }`}
      >
        {/* Visual Holding Feedback Banner */}
        {isHolding && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-3 text-center animate-in fade-in duration-150">
            <div className="w-10 h-10 rounded-full bg-[#C5A059] text-black flex items-center justify-center animate-bounce shadow-lg mb-1.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white bg-[#C5A059] text-black px-2.5 py-1 rounded-full shadow-md">
              جاري التصفح السريع... ⚡
            </span>
          </div>
        )}

        {/* List Image Container */}
        <div 
          className="relative aspect-square w-full sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-white dark:bg-[#1A1A1E] shrink-0 cursor-pointer flex items-center justify-center border border-[#EAEAEA] dark:border-[#27272A]"
          onClick={handleCardClick}
        >
          {!imgError && product.image ? (
            <img 
              src={getProductImageUrl(product)} 
              alt={product.name} 
              className="w-full h-full object-contain p-1 transition-none filter-none"
              style={{ imageRendering: 'auto', filter: 'none', transform: 'none' }}
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#FBF9F5] to-[#F5F2EB] dark:from-[#1E1A16] dark:to-[#161413]">
              <Sparkles className="w-8 h-8 text-[#C5A059] mb-1.5 opacity-80" />
              <span className="text-[11px] font-semibold text-[#1A1A1A] dark:text-[#E4E4E7] line-clamp-2 px-1">
                {product.name}
              </span>
            </div>
          )}

          {/* Quick Peek Button Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickPeek) onQuickPeek(product);
                else onQuickView(product);
              }}
              className="bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>معاينة خاطفة ⚡</span>
            </button>
          </div>

          {/* Out of stock badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
              <span className="bg-rose-600/90 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-md">
                نفدت الكمية
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {discountPercent > 0 && !isOutOfStock && (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs">
                -{discountPercent}%
              </span>
            )}
            {product.isBestSeller && !isOutOfStock && (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs">
                الأكثر طلباً 🔥
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-xs transition-all z-10 cursor-pointer ${
              isInWishlist
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white/90 dark:bg-black/60 text-[#666666] dark:text-[#A1A1AA] hover:text-rose-600'
            }`}
            title={isInWishlist ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <Heart className={`w-3.5 h-3.5 ${isInWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center Details Section */}
        <div className="flex-1 flex flex-col justify-between space-y-2 text-right">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {product.brand && (
                  <span className="text-[11px] font-bold text-[#C5A059] bg-[#C5A059]/10 dark:bg-[#C5A059]/20 px-2 py-0.5 rounded-md border border-[#C5A059]/20">
                    {product.brand}
                  </span>
                )}
                {product.volumeOrWeight && (
                  <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#202028] px-2 py-0.5 rounded-md">
                    {product.volumeOrWeight}
                  </span>
                )}
                {product.madeIn && (
                  <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] hidden sm:inline">
                    صنع في: {product.madeIn}
                  </span>
                )}
              </div>

              {/* 5 Stars Rating */}
              <div 
                onClick={() => onQuickView(product)}
                className="flex items-center gap-1 cursor-pointer"
                title={`التقييم: ${ratingStats.rating} / 5`}
              >
                <div className="flex items-center gap-0.5 text-[#C5A059]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-3 h-3 ${
                        star <= Math.round(ratingStats.rating) 
                          ? 'fill-[#C5A059] text-[#C5A059]' 
                          : 'text-[#D8D8DC] dark:text-[#383842]'
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#E4E4E7]">
                  {ratingStats.rating.toFixed(1)}
                </span>
                {ratingStats.hasReviews && (
                  <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
                    ({ratingStats.reviewCount})
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h4 
              onClick={() => onQuickView(product)}
              className="font-bold text-sm sm:text-base text-[#18181B] dark:text-[#F4F4F5] hover:text-[#C5A059] dark:hover:text-[#FFE58F] cursor-pointer transition-colors"
            >
              {product.name}
            </h4>

            {/* Short description or Benefits */}
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] line-clamp-2 leading-relaxed">
              {product.shortDescription || product.description}
            </p>
          </div>

          {/* Pricing & Stock status */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-xl font-black text-[#C5A059] dark:text-[#FFE58F]">
                {formatIQD(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-rose-500 line-through font-semibold">
                  {formatIQD(product.originalPrice)}
                </span>
              )}
            </div>
            {isOutOfStock ? (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                غير متوفر حالياً
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>متوفر للتوصيل الفوري</span>
              </span>
            )}
          </div>
        </div>

        {/* Right / Bottom Action Controls */}
        <div className="w-full sm:w-48 shrink-0 flex flex-col justify-center gap-2 pt-2 sm:pt-0 sm:border-r sm:border-[#EAEAEA] dark:sm:border-[#27272A] sm:pr-4">
          {isOutOfStock ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRequestStockAlert) onRequestStockAlert(product);
              }}
              className="w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>أخبرني عند التوفر 🔔</span>
            </button>
          ) : (
            <>
              {/* WhatsApp direct order */}
              <button
                onClick={handleWhatsAppDirect}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="طلب مباشر عبر الواتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>طلب واتساب سريع</span>
              </button>

              {/* Add to Cart or Quantity counter */}
              {cartQuantity === 0 ? (
                <button
                  onClick={handleAdd}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    isBouncing
                      ? 'animate-btn-bounce bg-[#C5A059] text-black border-[#C5A059] shadow-md'
                      : 'bg-[#1A1A1A] dark:bg-[#24242A] hover:bg-[#333333] dark:hover:bg-[#2F2F37] text-white border-transparent dark:border-[#33333C]'
                  }`}
                >
                  {isBouncing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-black animate-badge-pop" />
                      <span>تمت الإضافة!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>إضافة للسلة</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-between bg-[#FAFAFA] dark:bg-[#1E1E24] border border-[#EAEAEA] dark:border-[#2E2E35] rounded-xl p-1">
                  <button
                    onClick={() => onUpdateCartQuantity(product.id, cartQuantity - 1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-[#2E2E38] text-[#1A1A1A] dark:text-white hover:bg-[#EAEAEA] dark:hover:bg-[#3E3E4A] flex items-center justify-center font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    title="تقليل الكمية"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                    {cartQuantity} بالسلة
                  </span>
                  <button
                    onClick={() => onUpdateCartQuantity(product.id, cartQuantity + 1)}
                    className="w-7 h-7 rounded-lg bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black hover:bg-[#333333] dark:hover:bg-[#D4AF37] flex items-center justify-center font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    title="زيادة الكمية"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Quick details link */}
          <button
            onClick={() => onQuickView(product)}
            className="w-full bg-[#F4F4F5] dark:bg-[#1E1E24] hover:bg-[#E4E4E7] dark:hover:bg-[#282830] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-white py-1.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>تفاصيل المنتج</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`product-card-${product.id}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`group bg-white dark:bg-[#141418] rounded-xl border transition-all duration-300 flex flex-col justify-between overflow-hidden p-3.5 relative select-none ${
        isHolding
          ? 'ring-2 ring-[#C5A059] scale-[0.98] border-[#C5A059] shadow-xl'
          : isOutOfStock 
            ? 'border-[#EAEAEA] dark:border-[#27272A] opacity-90 hover:border-amber-500/50' 
            : 'border-[#EAEAEA] dark:border-[#27272A] hover:border-[#C5A059]/50 dark:hover:border-[#D4AF37]/50 shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]'
      }`}
    >
      {/* Visual Holding Feedback Banner */}
      {isHolding && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-3 text-center animate-in fade-in duration-150">
          <div className="w-10 h-10 rounded-full bg-[#C5A059] text-black flex items-center justify-center animate-bounce shadow-lg mb-1.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-white bg-[#C5A059] text-black px-2.5 py-1 rounded-full shadow-md">
            جاري التصفح السريع... ⚡
          </span>
        </div>
      )}

      {/* Top Image Container */}
      <div 
        className="relative aspect-square w-full bg-white dark:bg-[#1A1A1E] rounded-lg overflow-hidden cursor-pointer flex items-center justify-center border border-[#EAEAEA] dark:border-[#27272A]"
        onClick={handleCardClick}
      >
        {!imgError && product.image ? (
          <img 
            src={getProductImageUrl(product)} 
            alt={product.name} 
            className="w-full h-full object-contain p-1 transition-none filter-none"
            style={{ imageRendering: 'auto', filter: 'none', transform: 'none' }}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#FBF9F5] to-[#F5F2EB] dark:from-[#1E1A16] dark:to-[#161413]">
            <Sparkles className="w-8 h-8 text-[#C5A059] mb-1.5 opacity-80" />
            <span className="text-[11px] font-semibold text-[#1A1A1A] dark:text-[#E4E4E7] line-clamp-2 px-1">
              {product.name}
            </span>
            <span className="text-[10px] text-[#999999] dark:text-[#A1A1AA] mt-0.5 font-medium">
              {product.brand}
            </span>
          </div>
        )}

        {/* Quick view & Quick Peek button overlay on hover */}
        <div className="absolute inset-0 bg-stone-900/30 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-end p-2 gap-1.5 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickPeek) onQuickPeek(product);
              else onQuickView(product);
            }}
            className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold py-1.5 px-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تصفح سريع ⚡</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="w-full bg-white/95 dark:bg-[#1E1E24]/95 text-[#1A1A1A] dark:text-white hover:bg-white dark:hover:bg-[#282830] text-xs font-semibold py-1 px-2.5 rounded-lg shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-transparent dark:border-[#3A3A45]"
          >
            <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>تفاصيل كاملة</span>
          </button>
        </div>

        {/* Out of Stock Overlay / Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
            <span className="bg-rose-600/90 text-white font-bold text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>نفدت الكمية</span>
            </span>
          </div>
        )}

        {/* Badges Top Left/Right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {product.isBestSeller && !isOutOfStock && (
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
              <span>الأكثر طلباً</span>
              <span>🔥</span>
            </span>
          )}
          {product.isNew && (
            <span className="bg-[#1A1A1A] dark:bg-[#D4AF37] text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
              جديد
            </span>
          )}
          {discountPercent > 0 && !isOutOfStock && (
            <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-xs transition-all z-10 cursor-pointer ${
            isInWishlist
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white/90 dark:bg-black/60 text-[#666666] dark:text-[#A1A1AA] hover:text-rose-600 hover:bg-white dark:hover:bg-black/80'
          }`}
          title={isInWishlist ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Heart className={`w-3.5 h-3.5 ${isInWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Volume tag bottom right */}
        {product.volumeOrWeight && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.2 rounded">
            {product.volumeOrWeight}
          </span>
        )}
      </div>

      {/* Product Content */}
      <div className="pt-3 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-1.5">
          {/* Brand */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C5A059] dark:text-[#D4AF37] text-[11px] font-medium tracking-wide">
              {product.brand || product.category || 'كوزمتك الملكة'}
            </span>
            {ratingStats.hasReviews && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-900/40">
                تقييمات معتمدة
              </span>
            )}
          </div>

          {/* Title */}
          <h4 
            onClick={() => onQuickView(product)}
            className="font-medium text-xs sm:text-sm text-[#1A1A1A] dark:text-[#F4F4F5] line-clamp-2 hover:text-[#C5A059] dark:hover:text-[#FFE58F] cursor-pointer leading-snug h-10 overflow-hidden"
            title={product.name}
          >
            {product.name}
          </h4>

          {/* 5-Star Product Rating System (Under Product Title) */}
          <div 
            id={`product-stars-rating-${product.id}`}
            onClick={() => onQuickView(product)}
            className="flex items-center gap-1.5 pt-0.5 pb-1 cursor-pointer group/rating hover:opacity-90 transition-opacity"
            title={`تقييم المنتج: ${ratingStats.rating} من 5 (${ratingStats.hasReviews ? `${ratingStats.reviewCount} تقييم حقيقي` : 'انقر لإضافة أول تقييم للمنتج'})`}
          >
            {/* 5 Stars */}
            <div className="flex items-center gap-0.5 text-[#C5A059]">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-3.5 h-3.5 transition-transform group-hover/rating:scale-110 ${
                    star <= Math.round(ratingStats.rating) 
                      ? 'fill-[#C5A059] text-[#C5A059]' 
                      : 'text-[#D8D8DC] dark:text-[#383842]'
                  }`} 
                />
              ))}
            </div>

            {/* Score out of 5 */}
            <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#E4E4E7]">
              {ratingStats.rating.toFixed(1)}
              <span className="text-[10px] text-[#999999] dark:text-[#71717A] font-normal mr-0.5">/5</span>
            </span>

            {/* Review count badge or Rate Now prompt */}
            {ratingStats.hasReviews ? (
              <span className="text-[10px] text-[#777777] dark:text-[#A1A1AA] bg-[#F5F5F5] dark:bg-[#202028] px-1.5 py-0.2 rounded border border-[#EAEAEA] dark:border-[#2C2C35]">
                ({ratingStats.reviewCount} تقييم)
              </span>
            ) : (
              <span className="text-[10px] text-[#C5A059] font-medium hover:underline">
                (أضف تقييم)
              </span>
            )}
          </div>
        </div>

        {/* Price Section */}
        <div className="pt-1">
          <div className="flex items-baseline gap-2">
            <p className="text-base sm:text-lg font-bold text-[#C5A059] dark:text-[#FFE58F]">
              {formatIQD(product.price)}
            </p>
            {product.originalPrice && (
              <span className="text-xs text-rose-500 line-through font-semibold">
                {formatIQD(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-1.5 pt-1">
          {isOutOfStock ? (
            /* Out of stock: Notify me button */
            <button
              id={`notify-me-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onRequestStockAlert) {
                  onRequestStockAlert(product);
                }
              }}
              className="w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
              title="سجل رقمك وسنخبرك فور توفر كمية جديدة"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>أخبرني عند التوفر 🔔</span>
            </button>
          ) : (
            <>
              {/* 1-Click WhatsApp Quick Order */}
              <button
                id={`whatsapp-btn-${product.id}`}
                onClick={handleWhatsAppDirect}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="طلب مباشر عبر الواتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>طلب عبر الواتساب</span>
              </button>

              {/* Add to Cart / Quantity Toggle */}
              {cartQuantity === 0 ? (
                <button
                  id={`add-to-cart-${product.id}`}
                  onClick={handleAdd}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                    isBouncing
                      ? 'animate-btn-bounce bg-[#C5A059] text-black border-[#C5A059] shadow-md font-bold'
                      : 'bg-[#1A1A1A] dark:bg-[#24242A] hover:bg-[#333333] dark:hover:bg-[#2F2F37] text-white border-transparent dark:border-[#33333C] active:scale-95'
                  }`}
                >
                  {isBouncing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-black animate-badge-pop" />
                      <span>تمت الإضافة!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>إضافة إلى السلة</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-between bg-[#FAFAFA] dark:bg-[#1E1E24] border border-[#EAEAEA] dark:border-[#2E2E35] rounded-lg p-1">
                  <button
                    onClick={() => onUpdateCartQuantity(product.id, cartQuantity - 1)}
                    className="w-6 h-6 rounded bg-white dark:bg-[#2E2E38] text-[#1A1A1A] dark:text-white hover:bg-[#EAEAEA] dark:hover:bg-[#3E3E4A] flex items-center justify-center font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    title="تقليل الكمية"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                    {cartQuantity} بالسلة
                  </span>
                  <button
                    onClick={() => onUpdateCartQuantity(product.id, cartQuantity + 1)}
                    className="w-6 h-6 rounded bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black hover:bg-[#333333] dark:hover:bg-[#D4AF37] flex items-center justify-center font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    title="زيادة الكمية"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
