export type CategoryId = 'all' | 'bestsellers' | 'offers' | 'عناية' | string;

export interface SubCategory {
  id: string;
  name: string;
  enName?: string;
  iconName?: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  enName: string;
  iconName: string;
  description: string;
  subCategories?: SubCategory[];
}

export interface Product {
  id: string;
  name: string;
  enName?: string;
  brand?: string;
  category: string;
  subCategory?: string;
  price: number;
  originalPrice?: number;
  image: string;
  imageName?: string;
  additionalImages?: string[];
  description?: string;
  shortDescription?: string;
  rating?: number;
  reviewCount?: number;
  isBestSeller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isOffer?: boolean;
  inStock: boolean;
  stockCount?: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  volumeOrWeight?: string;
  madeIn?: string;
  benefits?: string[];
  howToUse?: string;
  tags?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface GovernorateDelivery {
  name: string;
  fee: number;
  estimatedDays: string;
}

export interface OrderCustomerDetails {
  name: string;
  phone: string;
  governorate: string;
  district?: string; // المنطقة / الحي (مثلاً: البصرة - التميمية)
  nearestLandmark?: string; // أقرب نقطة دالة (مثلاً: قرب مستشفى نفط البصرة)
  houseDetails?: string; // رقم البيت أو تفاصيل إضافية
  address: string; // العنوان الكامل
  notes?: string;
}

export type OrderStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface CustomerLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  mapUrl: string;
  isPinnedManually?: boolean;
  district?: string;
  nearestLandmark?: string;
}

export interface Order {
  id: string;
  trackingCode: string; // e.g. "ORD-4921"
  items: CartItem[];
  customer: OrderCustomerDetails;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  couponCode?: string;
  total: number;
  deliveryTiming: 'today' | 'tomorrow' | 'this_week' | 'custom';
  customTimingText?: string;
  location?: CustomerLocation;
  status: OrderStatus;
  createdAt: string;
  statusUpdatedAt: string;
  driverNotes?: string;
}

export interface StockNotificationRequest {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productPrice: number;
  productImage: string;
  customerPhone: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
  notified?: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  authorName: string;
  governorate?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedPurchase?: boolean;
  likes?: number;
}

export type ReviewSortOption = 'recent' | 'highest' | 'lowest';
