import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Star, 
  ShoppingBag, 
  MessageCircle, 
  Heart, 
  ShieldCheck, 
  Truck, 
  Sparkles,
  ExternalLink,
  Plus,
  Minus,
  Check,
  Zap,
  Eye
} from 'lucide-react';
import { Product } from '../types';
import { formatIQD } from '../data/products';
import { generateSingleProductWhatsAppUrl } from '../utils/whatsapp';
import { getProductDynamicRating } from '../data/reviews';
import { getProductImageUrl } from '../utils/image';

interface QuickPeekModalProps {
  product: Product | null;
  onClose: () => void;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenFullModal: (product: Product) => void;
  onRequestStockAlert?: (product: Product) => void;
  cartQuantity?: number;
}

export const QuickPeekModal: React.FC<QuickPeekModalProps> = ({
  product,
  onClose,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onOpenFullModal,
  onRequestStockAlert,
  cartQuantity = 0,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setImgError(false);
    }
  }, [product?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const isOutOfStock = product.inStock === false || product.stockCount === 0;
  const ratingStats = getProductDynamicRating(product.id, product.rating);

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAdd = () => {
    if (isOutOfStock) {
      if (onRequestStockAlert) onRequestStockAlert(product);
      return;
    }
    setIsBouncing(true);
    onAddToCart(product, quantity);
    setTimeout(() => {
      setIsBouncing(false);
    }, 450);
  };

  const handleWhatsApp = () => {
    const url = generateSingleProductWhatsAppUrl(product, quantity);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs"
      onClick={onClose}
    >
      {/* Quick Peek Card Container */}
      <motion.div 
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#141418] border border-[#EAEAEA] dark:border-[#2A2A32] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-[#18181C] via-[#24242A] to-[#18181C] text-white px-4 py-3 flex items-center justify-between border-b border-[#2E2E38]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#C5A059]/20 text-[#FFE58F] flex items-center justify-center border border-[#C5A059]/40">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>تصفح سريع للمنتج</span>
                <span className="text-[10px] bg-[#C5A059] text-black font-extrabold px-2 py-0.2 rounded-full">
                  معاينة خاطفة ⚡
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Wishlist toggle */}
            <button
              onClick={() => onToggleWishlist(product)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isInWishlist ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isInWishlist ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="إغلاق المعاينة السريعة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Main Grid: Image + Quick Info */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            
            {/* Image Column */}
            <div className="sm:col-span-5 relative aspect-square bg-white dark:bg-[#1A1A1E] rounded-xl overflow-hidden border border-[#EAEAEA] dark:border-[#27272A] group flex items-center justify-center">
              {!imgError && product.image ? (
                <img
                  src={getProductImageUrl(product)}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-2 bg-white"
                  style={{ imageRendering: 'auto' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#F5F2EB] dark:bg-[#1A1A1E]">
                  <Sparkles className="w-10 h-10 text-[#C5A059] mb-2" />
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                    {product.name}
                  </span>
                </div>
              )}

              {/* Badges Overlay */}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {product.isBestSeller && !isOutOfStock && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                    الأكثر طلباً 🔥
                  </span>
                )}
                {discountPercent > 0 && !isOutOfStock && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {product.volumeOrWeight && (
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-xs">
                  {product.volumeOrWeight}
                </span>
              )}
            </div>

            {/* Info Column */}
            <div className="sm:col-span-7 space-y-2.5">
              
              {/* Brand & Category */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#999999] dark:text-[#A1A1AA] font-bold text-[11px] tracking-wide">
                  {product.brand || product.category || 'كوزمتك الملكة'}
                </span>
                <span className="text-[10px] text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full font-semibold border border-[#C5A059]/20">
                  ضمان الجودة الملكية 👑
                </span>
              </div>

              {/* Title */}
              <h2 className="font-bold text-sm sm:text-base text-[#1A1A1A] dark:text-white leading-snug">
                {product.name}
              </h2>

              {/* Star Rating */}
              <div className="flex items-center gap-1.5 text-xs">
                <div className="flex items-center gap-0.5 text-[#C5A059]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-3.5 h-3.5 ${
                        star <= Math.round(ratingStats.rating) 
                          ? 'fill-[#C5A059] text-[#C5A059]' 
                          : 'text-[#D8D8DC] dark:text-[#383842]'
                      }`} 
                    />
                  ))}
                </div>
                <span className="font-bold text-[#1A1A1A] dark:text-white">
                  {ratingStats.rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-[#888888]">
                  ({ratingStats.reviewCount} تقييم)
                </span>
              </div>

              {/* Price Display */}
              <div className="pt-1 flex items-baseline gap-2.5">
                <span className="text-lg sm:text-xl font-extrabold text-[#C5A059] dark:text-[#FFE58F]">
                  {formatIQD(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-rose-500 line-through font-semibold">
                    {formatIQD(product.originalPrice)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                    توفير {formatIQD(product.originalPrice! - product.price)}
                  </span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-xs text-[#555555] dark:text-[#A1A1AA] leading-relaxed line-clamp-3 bg-[#FAFAFA] dark:bg-[#1A1A20] p-2.5 rounded-lg border border-[#EAEAEA] dark:border-[#27272A]">
                {product.description}
              </p>

            </div>
          </div>

          {/* Key Product Highlights Bullets */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="bg-[#FAF8F5] dark:bg-[#1A1A20] p-2 rounded-lg border border-[#EAEAEA] dark:border-[#27272A] flex items-center gap-1.5 text-[#333333] dark:text-[#D4D4D8]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium truncate">منتج أصلي ومضمون 100%</span>
            </div>
            <div className="bg-[#FAF8F5] dark:bg-[#1A1A20] p-2 rounded-lg border border-[#EAEAEA] dark:border-[#27272A] flex items-center gap-1.5 text-[#333333] dark:text-[#D4D4D8]">
              <Truck className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span className="font-medium truncate">توصيل سريع لكافة المناطق</span>
            </div>
          </div>

          {/* Stock & Quantity Selection */}
          {!isOutOfStock ? (
            <div className="space-y-3 pt-2 border-t border-[#EAEAEA] dark:border-[#27272A]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1A1A1A] dark:text-white">الكمية المطلوبة:</span>
                <div className="flex items-center gap-2 bg-[#FAFAFA] dark:bg-[#1C1C22] border border-[#EAEAEA] dark:border-[#2A2A32] rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded bg-white dark:bg-[#282832] text-[#1A1A1A] dark:text-white hover:bg-gray-100 dark:hover:bg-[#323240] flex items-center justify-center font-bold transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-xs text-[#1A1A1A] dark:text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black hover:bg-[#333333] dark:hover:bg-[#D4AF37] flex items-center justify-center font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isBouncing
                      ? 'bg-[#C5A059] text-black shadow-md'
                      : 'bg-[#1A1A1A] dark:bg-[#C5A059] text-white dark:text-black hover:bg-[#333333] dark:hover:bg-[#D4AF37] active:scale-98'
                  }`}
                >
                  {isBouncing ? (
                    <>
                      <Check className="w-4 h-4 text-black animate-badge-pop" />
                      <span>تمت الإضافة للسلة!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>إضافة {quantity} للسلة ({formatIQD(product.price * quantity)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>طلب مباشر بالواتساب</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#EAEAEA] dark:border-[#27272A]">
              <button
                type="button"
                onClick={() => {
                  if (onRequestStockAlert) onRequestStockAlert(product);
                  onClose();
                }}
                className="w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>أخبرني عند توفر كمية جديدة 🔔</span>
              </button>
            </div>
          )}

          {/* Full Product Detail Navigation Link */}
          <div className="pt-2 border-t border-[#EAEAEA] dark:border-[#27272A] text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullModal(product);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#C5A059] hover:text-[#B38F4D] dark:text-[#FFE58F] dark:hover:text-[#D4AF37] font-bold hover:underline cursor-pointer py-1 px-2"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>عرض الصفحة التفصيلية الكاملة والمراجعات ↗</span>
            </button>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};
