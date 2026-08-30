import { ProductReview, ReviewSortOption } from '../types';

const LOCAL_STORAGE_KEY = 'cosmetics_global_reviews_v1';

// In-memory cache for ultra-fast UI rendering
let memoryReviews: ProductReview[] = [];
let isInitialFetchDone = false;

function loadLocalCache(): ProductReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading reviews from localStorage:', err);
    return [];
  }
}

function saveLocalCache(reviews: ProductReview[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error('Error saving reviews to localStorage:', err);
  }
}

// Initialize memory cache
if (typeof window !== 'undefined') {
  memoryReviews = loadLocalCache();
}

/**
 * Fetch all reviews from the server and sync memory + localStorage
 */
export async function syncReviewsFromServer(): Promise<ProductReview[]> {
  try {
    const res = await fetch('/api/reviews');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reviews)) {
        memoryReviews = data.reviews;
        saveLocalCache(memoryReviews);
        isInitialFetchDone = true;

        // Dispatch update event for all components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('queen_reviews_synced', {
            detail: { count: memoryReviews.length }
          }));
        }
        return memoryReviews;
      }
    }
  } catch (err) {
    console.warn('Could not sync reviews from server, using local cache:', err);
  }
  return memoryReviews;
}

// Auto-trigger sync on module load in browser
if (typeof window !== 'undefined') {
  syncReviewsFromServer();

  // Listen to SSE stream for live real-time reviews from other users
  try {
    const sse = new EventSource('/api/orders/events');
    
    sse.addEventListener('NEW_PRODUCT_REVIEW', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.review) {
          const newRev = payload.review as ProductReview;
          // Avoid duplicates
          if (!memoryReviews.some(r => r.id === newRev.id)) {
            memoryReviews = [newRev, ...memoryReviews];
            saveLocalCache(memoryReviews);

            window.dispatchEvent(new CustomEvent('queen_product_review_added', {
              detail: { productId: newRev.productId, review: newRev }
            }));
          }
        }
      } catch (err) {
        console.error('Failed to parse NEW_PRODUCT_REVIEW SSE:', err);
      }
    });

    sse.addEventListener('REVIEW_LIKED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.reviewId) {
          const idx = memoryReviews.findIndex(r => r.id === payload.reviewId);
          if (idx !== -1) {
            memoryReviews[idx].likes = payload.likes;
            saveLocalCache(memoryReviews);
            window.dispatchEvent(new CustomEvent('queen_reviews_synced'));
          }
        }
      } catch (err) {
        console.error('Failed to parse REVIEW_LIKED SSE:', err);
      }
    });

    sse.addEventListener('REVIEW_DELETED', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.reviewId) {
          memoryReviews = memoryReviews.filter(r => r.id !== payload.reviewId);
          saveLocalCache(memoryReviews);
          window.dispatchEvent(new CustomEvent('queen_reviews_synced'));
        }
      } catch (err) {
        console.error('Failed to parse REVIEW_DELETED SSE:', err);
      }
    });
  } catch (err) {
    console.warn('SSE connection for reviews setup skipped:', err);
  }
}

/**
 * Get all reviews for a product (strictly genuine reviews visible to all users).
 */
export function getAllProductReviews(productId: string): ProductReview[] {
  return memoryReviews.filter((r) => String(r.productId) === String(productId));
}

/**
 * Submit a genuine product review to the server so it is globally visible to all visitors.
 */
export async function submitProductReview(
  productId: string,
  review: {
    authorName: string;
    governorate: string;
    rating: number;
    comment: string;
  }
): Promise<ProductReview> {
  const payload = {
    productId: String(productId),
    authorName: review.authorName.trim(),
    governorate: review.governorate.trim() || 'العراق',
    rating: Math.min(5, Math.max(1, review.rating)),
    comment: review.comment.trim(),
  };

  let savedReview: ProductReview;

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      savedReview = data.review;
    } else {
      throw new Error('Server returned error');
    }
  } catch (err) {
    console.warn('Failed to post review to server, falling back to local entry:', err);
    savedReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: String(productId),
      authorName: payload.authorName,
      governorate: payload.governorate,
      rating: payload.rating,
      comment: payload.comment,
      createdAt: new Date().toISOString(),
      verifiedPurchase: true,
      likes: 0,
    };
  }

  // Update memory cache immediately
  if (!memoryReviews.some(r => r.id === savedReview.id)) {
    memoryReviews = [savedReview, ...memoryReviews];
    saveLocalCache(memoryReviews);
  }

  // Dispatch event for UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('queen_product_review_added', {
      detail: { productId, review: savedReview }
    }));
  }

  return savedReview;
}

/**
 * Backward-compatible alias for saveStoredReview
 */
export async function saveStoredReview(
  productId: string,
  review: Omit<ProductReview, 'id' | 'createdAt' | 'productId'>
): Promise<ProductReview> {
  return submitProductReview(productId, {
    authorName: review.authorName,
    governorate: review.governorate || 'العراق',
    rating: review.rating,
    comment: review.comment,
  });
}

/**
 * Toggle Helpful / Like on a review (synced with server)
 */
export async function toggleReviewLikeOnServer(reviewId: string, isCurrentlyLiked: boolean) {
  try {
    await fetch(`/api/reviews/${reviewId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: isCurrentlyLiked ? 'unlike' : 'like' }),
    });
  } catch (err) {
    console.error('Failed to toggle review like:', err);
  }
}

/**
 * Calculate dynamic rating and count for a product based on genuine reviews across the entire store.
 */
export function getProductDynamicRating(productId: string, fallbackRating: number = 5): {
  rating: number;
  reviewCount: number;
  hasReviews: boolean;
} {
  const reviews = getAllProductReviews(productId);
  if (reviews.length === 0) {
    return {
      rating: fallbackRating,
      reviewCount: 0,
      hasReviews: false,
    };
  }

  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avg = Number((sum / reviews.length).toFixed(1));

  return {
    rating: avg,
    reviewCount: reviews.length,
    hasReviews: true,
  };
}

/**
 * Sort reviews by recent, highest, or lowest.
 */
export function sortProductReviews(reviews: ProductReview[], sortOption: ReviewSortOption): ProductReview[] {
  const cloned = [...reviews];
  switch (sortOption) {
    case 'recent':
      return cloned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'highest':
      return cloned.sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    case 'lowest':
      return cloned.sort((a, b) => {
        if (a.rating !== b.rating) {
          return a.rating - b.rating;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    default:
      return cloned;
  }
}

export function formatReviewDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
