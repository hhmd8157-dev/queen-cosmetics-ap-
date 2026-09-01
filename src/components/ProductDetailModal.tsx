import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Star, 
  ShoppingBag, 
  MessageCircle, 
  Heart, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Sparkles,
  Share2,
  Package,
  Globe,
  BellRing,
  AlertTriangle
} from 'lucide-react';
import { Product } from '../types';
import { formatIQD, STORE_INFO } from '../data/products';
import { generateSingleProductWhatsAppUrl } from '../utils/whatsapp';
import { ProductReviewsSection } from './ProductReviewsSection';
import { getProductDynamicRating } from '../data/reviews';
import { getProductImageUrl } from '../utils/image';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  isInWishlist: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onRequestStockAlert?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onRequestStockAlert,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<string>(product?.image || '');
  const [imgError, setImgError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [ratingStats, setRatingStats] = useState(() => 
    product ? getProductDynamicRating(product.id, product.rating) : { rating: 5, reviewCount: 0, hasReviews: false }
  );

  React.useEffect(() => {
    if (product) {
      setRatingStats(getProductDynamicRating(product.id, product.rating));
    }

    const handleReviewAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId: string }>;
      if (product && (!customEvent.detail || customEvent.detail.productId === product.id)) {
        setRatingStats(getProductDynamicRating(product.id, product.rating));
      }
    };

    window.addEventListener('queen_product_review_added', handleReviewAdded);
    window.addEventListener('queen_reviews_synced', handleReviewAdded);
    return () => {
      window.removeEventListener('queen_product_review_added', handleReviewAdded);
      window.removeEventListener('queen_reviews_synced', handleReviewAdded);
    };
  }, [product?.id, product?.rating]);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);

  React.useEffect(() => {
    if (product) {
      setSelectedImage(getProductImageUrl(product));
      setQuantity(1);
      setImgError(false);
    }
  }, [product?.id]);

  if (!product) return null;

  const isOutOfStock = product.inStock === false || product.stockCount === 0;
  const images = [getProductImageUrl(product), ...(product.additionalImages?.map(img => getProductImageUrl({ image: img })) || [])];

  const handleAddToCart = () => {
    if (isOutOfStock) {
      if (onRequestStockAlert) {
        onRequestStockAlert(product);
      }
      return;
    }
    setIsBouncing(true);
    onAddToCart(product, quantity);
    setTimeout(() => {
      setIsBouncing(false);
      onClose();
    }, 450);
  };

  const handleWhatsAppOrder = () => {
    const url = generateSingleProductWhatsAppUrl(product, quantity);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#EAEAEA] dark:border-[#27272A] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close & Actions */}
        <div className="p-4 sm:px-6 border-b border-[#EAEAEA] dark:border-[#27272A] flex items-center justify-between bg-white dark:bg-[#141418]">
          <div className="flex items-center gap-2">
            <span className="bg-[#FAFAFA] dark:bg-[#1E1E24] border border-[#EAEAEA] dark:border-[#33333C] text-[#1A1A1A] dark:text-[#E4E4E7] text-xs font-semibold px-2.5 py-0.5 rounded-md">
              {product.brand}
            </span>
            {product.isBestSeller && !isOutOfStock && (
              <span className="bg-[#C5A059] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                الأكثر طلباً
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>نفدت الكمية</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-[#999999] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F2F2F2] dark:hover:bg-[#222228] rounded-full transition-colors relative cursor-pointer"
              title="نسخ الرابط"
            >
              <Share2 className="w-4 h-4" />
              {copied && (
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[#1A1A1A] dark:bg-[#2A2A32] text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
                  تم النسخ!
                </span>
              )}
            </button>

            <button
              onClick={() => onToggleWishlist(product)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isInWishlist
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'text-[#999999] dark:text-[#A1A1AA] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#F2F2F2] dark:hover:bg-[#222228]'
              }`}
              title="المفضلة"
            >
              <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-[#999999] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F2F2F2] dark:hover:bg-[#222228] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            
            {/* Images Column */}
            <div className="space-y-3">
              <div className="aspect-square bg-white dark:bg-[#1A1A1E] rounded-xl overflow-hidden border border-[#EAEAEA] dark:border-[#27272A] relative flex items-center justify-center">
                {!imgError && selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product.name}
                    onError={() => setImgError(true)}
                    className={`w-full h-full object-contain p-2 image-rendering-crisp bg-white ${isOutOfStock ? 'grayscale-[30%]' : ''}`}
                    style={{ imageRendering: 'crisp-edges' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FBF9F5] to-[#F5F2EB] dark:from-[#1E1A16] dark:to-[#161413]">
                    <Sparkles className="w-12 h-12 text-[#C5A059] mb-2 opacity-80" />
                    <span className="text-sm font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">
                      {product.name}
                    </span>
                    <span className="text-xs text-[#999999] dark:text-[#A1A1AA] mt-1 font-medium">
                      {product.brand}
                    </span>
                  </div>
                )}
                {discountPercent > 0 && !isOutOfStock && (
                  <span className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-xs">
                    وفر {discountPercent}%
                  </span>
                )}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="bg-rose-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-md">
                      نفدت الكمية حالياً
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.filter(Boolean).length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.filter(Boolean).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${
                        selectedImage === img
                          ? 'border-[#C5A059] shadow-xs ring-2 ring-[#C5A059]/40'
                          : 'border-[#EAEAEA] dark:border-[#27272A] hover:border-[#C5A059]/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}

              {/* Quality & Delivery badges under photo */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-[#666666] dark:text-[#A1A1AA]">
                <div className="flex items-center gap-2 bg-[#FAFAFA] dark:bg-[#1E1E24] p-2.5 rounded-lg border border-[#EAEAEA] dark:border-[#2E2E35]">
                  <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>أصلي ومضمون 100%</span>
                </div>
                <div className="flex items-center gap-2 bg-[#FAFAFA] dark:bg-[#1E1E24] p-2.5 rounded-lg border border-[#EAEAEA] dark:border-[#2E2E35]">
                  <Truck className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>توصيل سريع للعراق</span>
                </div>
              </div>
            </div>

            {/* Product Details Column */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-white leading-snug">
                  {product.name}
                </h2>

                {product.enName && (
                  <p className="text-xs text-[#999999] dark:text-[#A1A1AA] font-sans tracking-wide">
                    {product.enName}
                  </p>
                )}

                {/* 5-Star Rating & Stock */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('product-reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAFAFA] dark:bg-[#1E1E26] border border-[#EAEAEA] dark:border-[#2C2C36] hover:border-[#C5A059] cursor-pointer transition-all hover:scale-102"
                    title="انقر لعرض التقييمات أو إضافة تقييمك"
                  >
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
                      <span className="text-[10px] text-[#999999] dark:text-[#71717A] font-normal mr-0.5">/5</span>
                    </span>
                    <span className="text-[11px] text-[#C5A059] font-medium mr-1">
                      {ratingStats.hasReviews ? `(${ratingStats.reviewCount} تقييم حقيقي)` : '(أضف تقييم)'}
                    </span>
                  </button>

                  {isOutOfStock ? (
                    <div className="flex items-center gap-1.5 text-rose-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>نفدت الكمية من المخزن</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#25D366] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
                      <span>متوفر في المخزن</span>
                    </div>
                  )}
                </div>

                {/* Price Display */}
                <div className="bg-[#FAFAFA] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#2E2E35] p-3.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#999999] dark:text-[#A1A1AA] block mb-0.5">السعر:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-[#C5A059] dark:text-[#FFE58F]">
                        {formatIQD(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-[#999999] dark:text-[#71717A] line-through">
                          {formatIQD(product.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {product.volumeOrWeight && (
                    <div className="text-left bg-white dark:bg-[#25252D] px-2.5 py-1 rounded-lg border border-[#EAEAEA] dark:border-[#33333D] text-xs font-semibold text-[#1A1A1A] dark:text-white">
                      <Package className="w-3.5 h-3.5 inline ml-1 text-[#C5A059]" />
                      <span>{product.volumeOrWeight}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">الوصف:</h4>
                  <p className="text-xs sm:text-sm text-[#666666] dark:text-[#A1A1AA] leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Benefits */}
                {product.benefits && product.benefits.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">المميزات والفوائد:</h4>
                    <ul className="space-y-1">
                      {product.benefits.map((b, i) => (
                        <li key={i} className="text-xs text-[#666666] dark:text-[#A1A1AA] flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* How to use */}
                {product.howToUse && (
                  <div className="bg-[#FAFAFA] dark:bg-[#1E1E24] p-3 rounded-lg border border-[#EAEAEA] dark:border-[#2E2E35] text-xs space-y-1">
                    <span className="font-semibold text-[#1A1A1A] dark:text-white block">طريقة الاستخدام:</span>
                    <p className="text-[#666666] dark:text-[#A1A1AA]">{product.howToUse}</p>
                  </div>
                )}

                {/* Country of Origin */}
                {product.madeIn && (
                  <div className="flex items-center gap-1.5 text-xs text-[#999999] dark:text-[#A1A1AA]">
                    <Globe className="w-3.5 h-3.5 text-[#999999] dark:text-[#A1A1AA]" />
                    <span>بلد المنشأ: <strong className="text-[#1A1A1A] dark:text-white">{product.madeIn}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Section */}
              {isOutOfStock ? (
                <div className="space-y-3 pt-4 border-t border-[#EAEAEA] dark:border-[#27272A]">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-3">
                    <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                    <div>
                      <span className="font-bold block">هذا المنتج غير متوفر حالياً بالمخزن</span>
                      <span className="text-[11px] opacity-90">يمكنك تسجيل رقمك وسنقوم بإشعارك والتواصل معك فور وصول الشحنة الجديدة!</span>
                    </div>
                  </div>

                  <button
                    id="modal-stock-notify-btn"
                    onClick={() => {
                      if (onRequestStockAlert) {
                        onRequestStockAlert(product);
                      }
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>أخبرني عند توفر هذا المنتج 🔔</span>
                  </button>
                </div>
              ) : (
                /* Quantity Selector & Action CTA Buttons */
                <div className="space-y-3 pt-4 border-t border-[#EAEAEA] dark:border-[#27272A]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#1A1A1A] dark:text-white">الكمية:</span>
                    <div className="flex items-center bg-[#FAFAFA] dark:bg-[#1E1E24] rounded-lg p-0.5 border border-[#EAEAEA] dark:border-[#2E2E35]">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-7 h-7 rounded bg-white dark:bg-[#2A2A33] text-[#1A1A1A] dark:text-white hover:bg-[#EAEAEA] dark:hover:bg-[#383844] flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-[#1A1A1A] dark:text-white">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-7 h-7 rounded bg-white dark:bg-[#2A2A33] text-[#1A1A1A] dark:text-white hover:bg-[#EAEAEA] dark:hover:bg-[#383844] flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs text-[#999999] dark:text-[#A1A1AA] mr-auto">
                      المجموع: <strong className="text-[#C5A059] dark:text-[#FFE58F] text-sm">{formatIQD(product.price * quantity)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* WhatsApp Direct Order Button */}
                    <button
                      id="modal-whatsapp-order-btn"
                      onClick={handleWhatsAppOrder}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>طلب عبر الواتساب</span>
                    </button>

                    {/* Add to Cart Button */}
                    <button
                      id="modal-add-to-cart-btn"
                      onClick={handleAddToCart}
                      className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                        isBouncing
                          ? 'animate-btn-bounce bg-[#C5A059] text-black ring-2 ring-[#C5A059]/50 scale-102 font-bold'
                          : 'bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black active:scale-95'
                      }`}
                    >
                      <ShoppingBag className={`w-4 h-4 ${isBouncing ? 'animate-badge-pop' : ''}`} />
                      <span>{isBouncing ? 'تمت الإضافة بنجاح!' : `إضافة إلى السلة (${quantity})`}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Customer Reviews Section */}
          <ProductReviewsSection product={product} />
        </div>
      </motion.div>
    </motion.div>
  );
};
