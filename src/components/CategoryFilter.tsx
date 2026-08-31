import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid,
  List,
  Flame, 
  Gift, 
  Sparkles, 
  ShieldCheck, 
  Flower2, 
  Crown,
  Tag,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { CategoryId } from '../types';
import { getStoredCategories } from '../data/products';

interface CategoryFilterProps {
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  selectedSubCategory?: string;
  onSelectSubCategory?: (id: string) => void;
  subCategoryCounts?: Record<string, number>;
  sortBy: string;
  onSortChange: (sort: string) => void;
  categoryCounts: Record<CategoryId, number>;
  totalProductsCount: number;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSubCategory = 'all',
  onSelectSubCategory,
  subCategoryCounts = {},
  sortBy,
  onSortChange,
  categoryCounts,
  totalProductsCount,
  viewMode = 'grid',
  onViewModeChange,
}) => {
  const [categories, setCategories] = useState(getStoredCategories());

  useEffect(() => {
    const handleCategoriesUpdate = () => {
      setCategories(getStoredCategories());
    };
    window.addEventListener('queen_categories_updated', handleCategoriesUpdate);
    return () => {
      window.removeEventListener('queen_categories_updated', handleCategoriesUpdate);
    };
  }, []);

  const currentCategoryData = categories.find((c) => c.id === selectedCategory);
  const subCategories = currentCategoryData?.subCategories || [];

  const getCategoryIcon = (id: string, iconName?: string) => {
    // If a custom iconName is provided (from category data), we could map it, 
    // but for now we fallback to the hardcoded icons or a default one.
    switch (id) {
      case 'all':
        return <LayoutGrid className="w-4 h-4 text-[#C5A059]" />;
      case 'bestsellers':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'offers':
        return <Gift className="w-4 h-4 text-rose-500" />;
      case 'bakhoor':
        return <Sparkles className="w-4 h-4 text-amber-700" />;
      case 'mixtures':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'skincare':
      case 'عناية':
        return <ShieldCheck className="w-4 h-4 text-cyan-600" />;
      case 'body_sprays_deo':
        return <Flower2 className="w-4 h-4 text-pink-500" />;
      case 'perfumes':
      case 'عطور':
        return <Crown className="w-4 h-4 text-purple-600" />;
      case 'haircare':
      case 'شعر':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      default:
        return <Tag className="w-4 h-4 text-[#C5A059]" />;
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Category Navigation Bar Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-bold text-[#18181B] dark:text-[#F4F4F5] flex items-center gap-2">
          <span className="w-2 h-5 bg-[#C5A059] rounded-full inline-block"></span>
          <span>شريط الأقسام والتبويب</span>
        </h2>
        <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] hidden sm:inline">
          اسحب أفقياً للتنقل بين الأقسام ➔
        </span>
      </div>

      {/* Category Pills Navigation with Smooth Horizontal Scroll on Mobile */}
      <div className="relative group">
        <div className="flex items-center gap-2.5 overflow-x-auto py-2 px-1 scrollbar-none no-scrollbar snap-x touch-pan-x scroll-smooth">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => {
                  onSelectCategory(cat.id);
                  if (onSelectSubCategory) {
                    onSelectSubCategory('all');
                  }
                }}
                className={`snap-start flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 shadow-xs border ${
                  isSelected
                    ? 'bg-[#18181B] dark:bg-[#C5A059] text-[#FFE58F] dark:text-black border-[#D4AF37] dark:border-[#FFE58F] shadow-md scale-102 ring-2 ring-[#D4AF37]/30'
                    : 'bg-white dark:bg-[#18181C] text-[#27272A] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#222228] hover:text-[#18181B] dark:hover:text-white border-[#E4E4E7] dark:border-[#27272A]'
                }`}
              >
                <span className="leading-none">
                  {getCategoryIcon(cat.id, cat.iconName)}
                </span>
                <span className="tracking-tight">{cat.name}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                    isSelected
                      ? 'bg-[#D4AF37] dark:bg-black text-black dark:text-white'
                      : 'bg-[#F4F4F5] dark:bg-[#2A2A30] text-[#52525B] dark:text-[#D4D4D8]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Category Filter Pills (when available for current category) */}
      {subCategories.length > 0 && onSelectSubCategory && (
        <div className="bg-[#FAF9F5] dark:bg-[#16161A] p-2 sm:p-2.5 rounded-xl border border-[#E9E6DC] dark:border-[#282830] animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap px-1 flex items-center gap-1">
              <span>🏷️ التصنيف الفرعي:</span>
            </span>
            {subCategories.map((subCat) => {
              const isSubSelected = (selectedSubCategory || 'all') === subCat.id;
              const subCount = subCategoryCounts[subCat.id];

              return (
                <button
                  key={subCat.id}
                  id={`subcat-btn-${subCat.id}`}
                  onClick={() => onSelectSubCategory(subCat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    isSubSelected
                      ? 'bg-[#C5A059] text-black font-extrabold border-[#B89246] shadow-xs'
                      : 'bg-white dark:bg-[#202026] text-[#3F3F46] dark:text-[#D4D4D8] hover:bg-white/80 dark:hover:bg-[#2A2A32] border-[#E4E4E7] dark:border-[#33333C]'
                  }`}
                >
                  <span>{subCat.name}</span>
                  {typeof subCount === 'number' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSubSelected
                          ? 'bg-black/20 text-black'
                          : 'bg-[#F4F4F5] dark:bg-[#2C2C34] text-[#71717A] dark:text-[#A1A1AA]'
                      }`}
                    >
                      {subCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter, Sorting, and View Mode Control Bar */}
      <div className="bg-white dark:bg-[#141418] p-3 sm:p-3.5 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-[#52525B] dark:text-[#A1A1AA] font-medium">
          <SlidersHorizontal className="w-4 h-4 text-[#C5A059]" />
          <span>
            معروض الآن: <strong className="text-[#18181B] dark:text-white font-bold">{totalProductsCount}</strong> منتج
          </span>
        </div>

        {/* Right side: Sort Select & View Mode Toggle */}
        <div className="flex items-center gap-3 mr-auto sm:mr-0 flex-wrap">
          {/* Sort Select */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-[#A1A1AA]" />
            <span className="text-[#71717A] dark:text-[#A1A1AA] text-xs hidden md:inline">ترتيب حسب:</span>
            <select
              id="product-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-[#F4F4F5] dark:bg-[#1E1E24] hover:bg-[#E4E4E7] dark:hover:bg-[#282830] border border-[#E4E4E7] dark:border-[#33333C] rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-[#18181B] dark:text-white outline-hidden focus:border-[#C5A059] cursor-pointer"
            >
              <option value="featured">المميز والأكثر طلباً</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>

          {/* Grid / List View Mode Toggle Button Group */}
          {onViewModeChange && (
            <div 
              id="product-view-mode-toggle"
              className="flex items-center bg-[#F4F4F5] dark:bg-[#1E1E24] p-1 rounded-xl border border-[#E4E4E7] dark:border-[#33333C]"
              role="group"
              aria-label="نمط عرض المنتجات"
            >
              <button
                type="button"
                id="toggle-view-grid-btn"
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#2A2A34] text-[#C5A059] dark:text-[#FFE58F] shadow-xs border border-[#E4E4E7] dark:border-[#3E3E4C]'
                    : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-white'
                }`}
                title="عرض شبكي (Grid View)"
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">شبكة</span>
              </button>

              <button
                type="button"
                id="toggle-view-list-btn"
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#2A2A34] text-[#C5A059] dark:text-[#FFE58F] shadow-xs border border-[#E4E4E7] dark:border-[#3E3E4C]'
                    : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-white'
                }`}
                title="عرض قائمة (List View)"
                aria-pressed={viewMode === 'list'}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">قائمة</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
