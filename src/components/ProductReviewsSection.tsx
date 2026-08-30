import React, { useState, useMemo, useEffect } from 'react';
import { 
  Star, 
  ArrowDownUp, 
  MessageSquarePlus, 
  CheckCircle2, 
  ThumbsUp, 
  ShieldCheck, 
  User, 
  Send, 
  Calendar, 
  Sparkles, 
  ChevronDown,
  Globe
} from 'lucide-react';
import { Product, ProductReview, ReviewSortOption } from '../types';
import { 
  getAllProductReviews, 
  submitProductReview, 
  toggleReviewLikeOnServer,
  sortProductReviews, 
  formatReviewDate 
} from '../data/reviews';

interface ProductReviewsSectionProps {
  product: Product;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ product }) => {
  const [reviews, setReviews] = useState<ProductReview[]>(() => getAllProductReviews(product.id));
  const [sortOption, setSortOption] = useState<ReviewSortOption>('recent');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});

  // Form State
  const [authorName, setAuthorName] = useState<string>('');
  const [governorate, setGovernorate] = useState<string>('بغداد');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Sync reviews when product changes or when global review events arrive
  useEffect(() => {
    setReviews(getAllProductReviews(product.id));
    setShowAddForm(false);
    setSubmitSuccess(false);

    const handleUpdate = () => {
      setReviews(getAllProductReviews(product.id));
    };

    window.addEventListener('queen_product_review_added', handleUpdate);
    window.addEventListener('queen_reviews_synced', handleUpdate);

    return () => {
      window.removeEventListener('queen_product_review_added', handleUpdate);
      window.removeEventListener('queen_reviews_synced', handleUpdate);
    };
  }, [product.id]);

  // Calculations
  const totalReviewsCount = reviews.length;
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return product.rating || 5.0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews, product.rating]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    return sortProductReviews(reviews, sortOption);
  }, [reviews, sortOption]);

  const handleLikeReview = async (reviewId: string) => {
    const isCurrentlyLiked = !!likedReviews[reviewId];
    setLikedReviews((prev) => ({
      ...prev,
      [reviewId]: !isCurrentlyLiked,
    }));
    await toggleReviewLikeOnServer(reviewId, isCurrentlyLiked);
  };

  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      const saved = await submitProductReview(product.id, {
        authorName: authorName.trim(),
        governorate: governorate.trim() || 'العراق',
        rating,
        comment: comment.trim(),
      });

      setReviews((prev) => {
        if (prev.some(r => r.id === saved.id)) return prev;
        return [saved, ...prev];
      });
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setAuthorName('');
      setComment('');
      setRating(5);

      setTimeout(() => {
        setSubmitSuccess(false);
        setShowAddForm(false);
      }, 2500);
    } catch (err) {
      console.error('Error submitting review:', err);
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5: return 'ممتاز جداً ⭐⭐⭐⭐⭐';
      case 4: return 'جيد جداً ⭐⭐⭐⭐';
      case 3: return 'جيد ⭐⭐⭐';
      case 2: return 'مقبول ⭐⭐';
      case 1: return 'ضعيف ⭐';
      default: return '';
    }
  };

  return (
    <div id="product-reviews-section" className="pt-6 border-t border-[#EAEAEA] dark:border-[#27272A] space-y-6">
      
      {/* Header & Overall Summary */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <span>تقييمات وآراء العملاء</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-[#FAFAFA] dark:bg-[#25252D] text-[#C5A059] border border-[#EAEAEA] dark:border-[#33333D] rounded-full">
                {totalReviewsCount > 0 ? `${totalReviewsCount} تقييم حقيقي` : 'تقييمات جديدة'}
              </span>
            </h3>
          </div>

          <button
            id="toggle-add-review-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C5A059]/10 dark:bg-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059] hover:text-black transition-colors cursor-pointer border border-[#C5A059]/30 shadow-2xs"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>{showAddForm ? 'إلغاء التقييم' : 'أضف تقييمك للمنتج'}</span>
          </button>
        </div>

        {/* Rating Breakdown Card */}
        <div className="bg-[#FAFAFA] dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#2E2E35] rounded-xl p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            
            {/* Left/Main Score */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center text-center sm:border-l sm:border-[#EAEAEA] dark:sm:border-[#2E2E35] sm:pl-4">
              <span className="text-4xl sm:text-5xl font-black text-[#C5A059] dark:text-[#FFE58F] tracking-tight">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex items-center gap-1 my-1.5 text-[#C5A059]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'fill-[#C5A059] text-[#C5A059]' : 'text-[#D1D1D6] dark:text-[#3A3A44]'}`} 
                  />
                ))}
              </div>
              <span className="text-xs text-[#999999] dark:text-[#A1A1AA]">
                {totalReviewsCount > 0 
                  ? `بناءً على ${totalReviewsCount} تقييم معتمد` 
                  : 'نظام تقييم معتمد من 5 نجوم'}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تقييمات زبائن حقيقية 100%</span>
              </span>
            </div>

            {/* Right/Bars Breakdown */}
            <div className="sm:col-span-8 space-y-1.5 pr-0 sm:pr-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingCounts[stars as 1 | 2 | 3 | 4 | 5] || 0;
                const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 w-10 shrink-0 text-[#666666] dark:text-[#A1A1AA] font-medium">
                      <span>{stars}</span>
                      <Star className="w-3 h-3 fill-[#C5A059] text-[#C5A059]" />
                    </div>
                    <div className="flex-1 h-2 bg-[#EAEAEA] dark:bg-[#27272F] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-left text-[11px] text-[#999999] dark:text-[#71717A] font-mono">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Add Review Form */}
      {showAddForm && (
        <form 
          id="add-review-form"
          onSubmit={handleAddReviewSubmit}
          className="bg-white dark:bg-[#1C1C22] border border-[#C5A059]/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-[#2E2E35] pb-3">
            <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>مشاركة تجربتك وتقييمك للمنتج</span>
            </h4>
            <span className="text-[11px] text-[#999999] dark:text-[#A1A1AA]">
              تقييمك الحقيقي يساعد زبائننا الكرام
            </span>
          </div>

          {/* Star Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">
              اختر عدد النجوم (من 5):
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#FAFAFA] dark:bg-[#25252E] px-3 py-2 rounded-lg border border-[#EAEAEA] dark:border-[#33333D]">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = hoverRating ? star <= hoverRating : star <= rating;
                  return (
                    <button
                      type="button"
                      key={star}
                      id={`star-select-${star}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 text-[#C5A059] hover:scale-120 transition-transform cursor-pointer"
                      title={`${star} من 5 نجوم`}
                    >
                      <Star 
                        className={`w-5 h-5 ${active ? 'fill-[#C5A059] text-[#C5A059]' : 'text-[#D1D1D6] dark:text-[#4B4B58]'}`} 
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-[#C5A059]">
                {getRatingLabel(hoverRating || rating)}
              </span>
            </div>
          </div>

          {/* User Name & Governorate Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">
                اسمك الكريم:
              </label>
              <input
                id="review-author-name-input"
                type="text"
                required
                placeholder="مثال: نور الهدى"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full text-xs bg-[#FAFAFA] dark:bg-[#25252E] border border-[#EAEAEA] dark:border-[#33333D] rounded-lg px-3 py-2 text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">
                المحافظة / المدينة:
              </label>
              <select
                id="review-governorate-select"
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full text-xs bg-[#FAFAFA] dark:bg-[#25252E] border border-[#EAEAEA] dark:border-[#33333D] rounded-lg px-3 py-2 text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#C5A059]"
              >
                <option value="بغداد">بغداد</option>
                <option value="البصرة">البصرة</option>
                <option value="أربيل">أربيل</option>
                <option value="النجف الأشرف">النجف الأشرف</option>
                <option value="كربلاء المقدسة">كربلاء المقدسة</option>
                <option value="بابل">بابل</option>
                <option value="نينوى (الموصل)">نينوى (الموصل)</option>
                <option value="السليمانية">السليمانية</option>
                <option value="كركوك">كركوك</option>
                <option value="ذي قار (الناصرية)">ذي قار (الناصرية)</option>
                <option value="ديالى">ديالى</option>
                <option value="الأنبار">الأنبار</option>
                <option value="ميسان (العمارة)">ميسان (العمارة)</option>
                <option value="واسط (الكوت)">واسط (الكوت)</option>
                <option value="صلاح الدين">صلاح الدين</option>
                <option value="الديوانية">الديوانية</option>
                <option value="المثنى (السماوة)">المثنى (السماوة)</option>
                <option value="دهوك">دهوك</option>
              </select>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#1A1A1A] dark:text-[#E4E4E7]">
              تفاصيل رأيك وتجربتك مع المنتج:
            </label>
            <textarea
              id="review-comment-textarea"
              required
              rows={3}
              placeholder="اكتب تجربتك بكل صراحة (الرائحة، الثبات، النتيجة، التغليف...)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-xs bg-[#FAFAFA] dark:bg-[#25252E] border border-[#EAEAEA] dark:border-[#33333D] rounded-lg p-3 text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#C5A059] resize-none"
            />
          </div>

          {/* Submit Button & Status */}
          <div className="flex items-center justify-between pt-1">
            {submitSuccess ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم نشر تقييمك بنجاح! شكراً لمشاركتك ❤️</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#999999] dark:text-[#71717A]">
                يتم حفظ تقييمك فوراً ويظهر لجميع الزوار
              </span>
            )}

            <button
              type="submit"
              id="submit-review-btn"
              disabled={isSubmitting || submitSuccess}
              className="px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'جارٍ النشر...' : 'إرسال التقييم'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Sorting Control Bar (shown if reviews exist) */}
      {totalReviewsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA] dark:bg-[#1A1A20] px-4 py-2.5 rounded-xl border border-[#EAEAEA] dark:border-[#2E2E35]">
          <span className="text-xs font-bold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>ترتيب التقييمات حسب:</span>
          </span>

          {/* Sorting Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              id="reviews-sort-dropdown"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as ReviewSortOption)}
              className="appearance-none bg-white dark:bg-[#25252E] text-xs font-semibold text-[#1A1A1A] dark:text-white pl-8 pr-3 py-1.5 rounded-lg border border-[#EAEAEA] dark:border-[#3A3A45] focus:outline-none focus:border-[#C5A059] cursor-pointer shadow-2xs hover:border-[#C5A059]/50 transition-colors"
            >
              <option value="recent">الأحدث أولاً (Most Recent)</option>
              <option value="highest">الأعلى تقييماً (Highest Rated)</option>
              <option value="lowest">الأقل تقييماً (Lowest Rated)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#999999] dark:text-[#A1A1AA] absolute left-2.5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {sortedReviews.length === 0 ? (
          <div className="text-center py-8 bg-[#FAFAFA] dark:bg-[#1A1A20] rounded-xl border border-dashed border-[#D1D1D6] dark:border-[#2E2E35] p-6 space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center mx-auto">
              <Star className="w-5 h-5 fill-[#C5A059]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                لا توجد تقييمات مسجلة بعد لهذا المنتج
              </p>
              <p className="text-[11px] text-[#999999] dark:text-[#A1A1AA] mt-1">
                جرّبت هذا المنتج؟ كن أول من يضع تقييمه بالنجوم ويشارك تجربته مع الزبائن!
              </p>
            </div>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>أضف أول تقييم للمنتج ⭐</span>
              </button>
            )}
          </div>
        ) : (
          sortedReviews.map((rev) => {
            const isLiked = likedReviews[rev.id];
            const currentLikes = (rev.likes || 0) + (isLiked ? 1 : 0);

            return (
              <div 
                key={rev.id}
                id={`review-item-${rev.id}`}
                className="bg-white dark:bg-[#1A1A20] border border-[#EAEAEA] dark:border-[#27272F] hover:border-[#C5A059]/30 rounded-xl p-4 space-y-2.5 transition-colors"
              >
                {/* Reviewer Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar Icon */}
                    <div className="w-8 h-8 rounded-full bg-[#FAFAFA] dark:bg-[#25252F] border border-[#EAEAEA] dark:border-[#33333D] text-[#C5A059] flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#1A1A1A] dark:text-white">
                          {rev.authorName}
                        </span>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>مشتري موثوق</span>
                          </span>
                        )}
                      </div>
                      {rev.governorate && (
                        <span className="text-[11px] text-[#999999] dark:text-[#71717A] block">
                          {rev.governorate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stars and Date */}
                  <div className="text-left flex flex-col items-end">
                    <div className="flex items-center gap-0.5 text-[#C5A059]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3 h-3 ${star <= rev.rating ? 'fill-[#C5A059] text-[#C5A059]' : 'text-[#D1D1D6] dark:text-[#33333C]'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#999999] dark:text-[#71717A] mt-0.5 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{formatReviewDate(rev.createdAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-sm text-[#444444] dark:text-[#D4D4D8] leading-relaxed pr-10">
                  {rev.comment}
                </p>

                {/* Like / Helpful button */}
                <div className="flex items-center justify-end pt-1 border-t border-[#F0F0F0] dark:border-[#25252C]">
                  <button
                    onClick={() => handleLikeReview(rev.id)}
                    className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      isLiked 
                        ? 'text-[#C5A059] font-bold bg-[#C5A059]/10' 
                        : 'text-[#999999] dark:text-[#A1A1AA] hover:text-[#C5A059] hover:bg-[#FAFAFA] dark:hover:bg-[#25252E]'
                    }`}
                    title="مفيد"
                  >
                    <ThumbsUp className={`w-3 h-3 ${isLiked ? 'fill-[#C5A059]' : ''}`} />
                    <span>مفيد ({currentLikes})</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
