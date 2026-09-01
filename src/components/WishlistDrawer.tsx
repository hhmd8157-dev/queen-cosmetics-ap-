import React from 'react';
import { motion } from 'motion/react';
import { X, Trash2, ShoppingBag, Heart, MessageCircle, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { formatIQD } from '../data/products';
import { generateSingleProductWhatsAppUrl } from '../utils/whatsapp';
import { getProductImageUrl } from '../utils/image';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveWishlist: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onClearWishlist: () => void;
  onExplore: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlist,
  onRemoveWishlist,
  onAddToCart,
  onClearWishlist,
  onExplore,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="w-full max-w-md bg-white dark:bg-[#141418] text-[#1A1A1A] dark:text-[#F4F4F5] h-full shadow-2xl flex flex-col justify-between overflow-hidden border-r border-[#EAEAEA] dark:border-[#27272A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-[#EAEAEA] dark:border-[#27272A] bg-white dark:bg-[#18181C] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-[#1A1A1A] dark:text-white text-lg">المفضلة</h2>
            <span className="text-xs text-[#999999] dark:text-[#A1A1AA]">
              ({wishlist.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {wishlist.length > 0 && (
              <button
                onClick={onClearWishlist}
                className="text-xs text-[#999999] dark:text-[#A1A1AA] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                title="مسح المفضلة"
              >
                مسح الكل
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 text-[#999999] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {wishlist.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="w-16 h-16 bg-[#FAFAFA] dark:bg-[#1E1E24] text-rose-500 rounded-full flex items-center justify-center mx-auto border border-[#EAEAEA] dark:border-[#2E2E35]">
                <Heart className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1A1A1A] dark:text-white text-base">قائمة المفضلة فارغة</h3>
                <p className="text-xs text-[#999999] dark:text-[#A1A1AA] max-w-xs mx-auto">
                  احفظ منتجاتك المفضلة هنا للرجوع إليها وطلبها بسهولة في أي وقت.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onExplore();
                }}
                className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black font-semibold text-xs px-5 py-2.5 rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>استكشف المنتجات</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            wishlist.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-[#18181C] rounded-xl border border-[#EAEAEA] dark:border-[#27272A] hover:border-[#C5A059]/40 transition-colors"
              >
                {product.image ? (
                  <img
                    src={getProductImageUrl(product)}
                    alt={product.name}
                    className="w-14 h-14 rounded-lg object-contain bg-white shrink-0 border border-[#EAEAEA] dark:border-[#2E2E35]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[#F8F8F8] dark:bg-[#202026] shrink-0 border border-[#EAEAEA] dark:border-[#2E2E35]" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-xs text-[#1A1A1A] dark:text-white truncate" title={product.name}>
                      {product.name}
                    </h4>
                    <button
                      onClick={() => onRemoveWishlist(product)}
                      className="text-[#999999] hover:text-rose-600 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[10px] text-[#999999] dark:text-[#A1A1AA] mb-1">
                    {product.brand}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-xs text-[#C5A059] dark:text-[#FFE58F]">
                      {formatIQD(product.price)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const url = generateSingleProductWhatsAppUrl(product, 1);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-1.5 rounded-lg bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors text-xs font-semibold flex items-center cursor-pointer"
                        title="طلب عبر الواتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          onAddToCart(product);
                        }}
                        className="bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>للسلة</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {wishlist.length > 0 && (
          <div className="p-4 border-t border-[#EAEAEA] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#18181C]">
            <button
              onClick={() => {
                wishlist.forEach((p) => onAddToCart(p));
                onClose();
              }}
              className="w-full bg-[#1A1A1A] dark:bg-[#C5A059] hover:bg-[#333333] dark:hover:bg-[#D4AF37] text-white dark:text-black font-semibold text-xs py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>إضافة جميع المفضلة إلى السلة ({wishlist.length})</span>
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
