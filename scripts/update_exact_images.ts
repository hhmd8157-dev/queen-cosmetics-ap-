import fs from 'fs';
import path from 'path';

const imageUrls = [
  "https://i.ibb.co/GvSCyJ2G/image.jpg",
  "https://i.ibb.co/N63j37MS/image.jpg",
  "https://i.ibb.co/xPdtCn3/image.jpg",
  "https://i.ibb.co/9Hn4j2ZY/image.jpg",
  "https://i.ibb.co/3Zk4WX2/image.jpg",
  "https://i.ibb.co/Xfxrs1Tv/image.jpg",
  "https://i.ibb.co/jZ1mC14Z/image.jpg",
  "https://i.ibb.co/Tqm9W9Kg/image.jpg",
  "https://i.ibb.co/kV9j2VvR/image.jpg",
  "https://i.ibb.co/hJVTtxps/image.jpg",
  "https://i.ibb.co/9HMtr43N/image.jpg",
  "https://i.ibb.co/z3ZvBFN/image.jpg",
  "https://i.ibb.co/6JbJSx2r/image.jpg",
  "https://i.ibb.co/1JpPD97d/image.jpg",
  "https://i.ibb.co/CX1qtcN/image.jpg",
  "https://i.ibb.co/Qvb2WC2d/image.jpg",
  "https://i.ibb.co/jkNfcwXk/image.jpg",
  "https://i.ibb.co/NgZsMJXN/image.jpg",
  "https://i.ibb.co/3mGCzcy2/image.jpg",
  "https://i.ibb.co/6RT8kbX3/image.jpg",
  "https://i.ibb.co/Z18FpynV/image.jpg",
  "https://i.ibb.co/rK2rJQzy/image.jpg",
  "https://i.ibb.co/QFpGRdZC/image.jpg",
  "https://i.ibb.co/bjKxkrfB/image.jpg",
  "https://i.ibb.co/4RztncpJ/image.jpg",
  "https://i.ibb.co/hJ6yFZBf/image.jpg",
  "https://i.ibb.co/gZ7yzrdJ/image.jpg",
  "https://i.ibb.co/MkCNQd9z/image.jpg",
  "https://i.ibb.co/Z6Pg6x6y/image.jpg",
  "https://i.ibb.co/rRTw3g2m/image.jpg",
  "https://i.ibb.co/chprL02W/image.jpg",
  "https://i.ibb.co/zH2BWnGy/image.jpg",
  "https://i.ibb.co/fYMJ1ZQS/image.jpg",
  "https://i.ibb.co/HDQmtfj8/image.jpg",
  "https://i.ibb.co/hFMPXWfW/image.jpg",
  "https://i.ibb.co/Fb0tq08W/image.jpg",
  "https://i.ibb.co/mVfMb9Jz/image.jpg",
  "https://i.ibb.co/tMkD27KG/image.jpg",
  "https://i.ibb.co/LznrXRyj/image.jpg",
  "https://i.ibb.co/bMF9VQnM/image.jpg",
  "https://i.ibb.co/FkB9LV3Y/image.jpg",
  "https://i.ibb.co/sp1C5ymw/image.jpg",
  "https://i.ibb.co/3mNTHYx9/image.jpg",
  "https://i.ibb.co/v4RV9p38/image.jpg",
  "https://i.ibb.co/7xrx9SQB/image.jpg",
  "https://i.ibb.co/JDGCt76/image.jpg",
  "https://i.ibb.co/7JP9FdyM/image.jpg",
  "https://i.ibb.co/NhDkV0n/image.jpg",
  "https://i.ibb.co/99xV1WC8/image.jpg",
  "https://i.ibb.co/Qv9NPgR0/image.jpg",
  "https://i.ibb.co/39cs4Qwr/image.jpg",
  "https://i.ibb.co/tpHpnnxh/image.jpg",
  "https://i.ibb.co/Rpwq8MRB/image.jpg",
  "https://i.ibb.co/x8PPCGWw/image.jpg",
  "https://i.ibb.co/sd0Th2JR/image.jpg",
  "https://i.ibb.co/Wvn8MLRG/image.jpg",
  "https://i.ibb.co/RThdRSzB/image.jpg",
  "https://i.ibb.co/XZhsWTfC/image.jpg",
  "https://i.ibb.co/rKd4QkdL/image.jpg",
  "https://i.ibb.co/DP0HYw34/image.jpg",
  "https://i.ibb.co/MxgDxrLY/image.jpg",
  "https://i.ibb.co/rqbGpkx/image.jpg",
  "https://i.ibb.co/LdkMJGtW/image.jpg",
  "https://i.ibb.co/fVPfsz0w/image.jpg",
  "https://i.ibb.co/KjCVdH1g/image.jpg",
  "https://i.ibb.co/hFtK1D74/image.jpg",
  "https://i.ibb.co/wh34qV1M/image.jpg",
  "https://i.ibb.co/39MBzDhC/image.jpg",
  "https://i.ibb.co/7xTZVmSk/image.jpg",
  "https://i.ibb.co/mr5j9ddp/image.jpg",
  "https://i.ibb.co/21HG4c7D/image.jpg",
  "https://i.ibb.co/Y7gw26q3/image.jpg",
  "https://i.ibb.co/TMx5VWzQ/image.jpg",
  "https://i.ibb.co/KBH8jQC/image.jpg",
  "https://i.ibb.co/1t5pxrnD/image.jpg",
  "https://i.ibb.co/cS5CvvCZ/image.jpg",
  "https://i.ibb.co/DDqL72qC/image.jpg",
  "https://i.ibb.co/B5WpfT8C/image.jpg",
  "https://i.ibb.co/1G25yTp9/image.jpg",
  "https://i.ibb.co/9HHKG6g4/image.jpg",
  "https://i.ibb.co/Y71KJm6G/image.jpg",
  "https://i.ibb.co/M5V7vxgS/image.jpg",
  "https://i.ibb.co/yB8fwb3G/image.jpg",
  "https://i.ibb.co/5hsZydxR/image.jpg",
  "https://i.ibb.co/qMWJx2B3/image.jpg",
  "https://i.ibb.co/VpJXW7cD/image.jpg",
  "https://i.ibb.co/k2pFRB9S/image.jpg",
  "https://i.ibb.co/0pZT70F5/image.jpg",
  "https://i.ibb.co/G3VPpVkm/image.jpg",
  "https://i.ibb.co/x8SC4jvB/image.jpg",
  "https://i.ibb.co/9Hf49ddb/image.jpg",
  "https://i.ibb.co/GQkV9v7Q/image.jpg",
  "https://i.ibb.co/Rr65fNW/image.jpg",
  "https://i.ibb.co/hFCCH48s/image.jpg",
  "https://i.ibb.co/5yWkF72/image.jpg",
  "https://i.ibb.co/QFJSKKsF/image.jpg",
  "https://i.ibb.co/5hCcCWHC/image.jpg",
  "https://i.ibb.co/d04c8qK8/image.jpg",
  "https://i.ibb.co/ycmmXmFj/image.jpg",
  "https://i.ibb.co/G4B6V2K2/image.jpg",
  "https://i.ibb.co/GYZJtXJ/image.jpg",
  "https://i.ibb.co/WNcLqzqR/image.jpg",
  "https://i.ibb.co/k6cGzrXV/image.jpg"
];

const jsonPath = path.join(process.cwd(), 'scripts/analyzed_lite_products.json');
const productsTsPath = path.join(process.cwd(), 'src/data/products.ts');

if (!fs.existsSync(jsonPath)) {
  console.error("No analyzed_lite_products.json found!");
  process.exit(1);
}

const analyzed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

for (let i = 0; i < analyzed.length && i < imageUrls.length; i++) {
  analyzed[i].image = imageUrls[i];
}

fs.writeFileSync(jsonPath, JSON.stringify(analyzed, null, 2), 'utf-8');

// Now regenerate src/data/products.ts
let tsContent = `import { Category, GovernorateDelivery, CategoryId } from "../types";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  enName?: string;
  brand?: string;
  subCategory?: string;
  additionalImages?: string[];
  description?: string;
  shortDescription?: string;
  rating?: number;
  reviewCount?: number;
  isBestSeller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isOffer?: boolean;
  stockCount?: number;
  volumeOrWeight?: string;
  madeIn?: string;
  benefits?: string[];
  howToUse?: string;
  tags?: string[];
}

export const formatIQD = (amount: number) => {
  return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(amount).replace('IQD', 'د.ع');
};

export const STORE_INFO = {
  name: "كوزمتك الملكة",
  enName: "Queen Cosmetics",
  tagline: "المتجر الملكي الأول للعناية والتجميل الأصلي في العراق",
  phone: "+964 770 000 0000",
  whatsappNumber: "+9647700000000",
  whatsapp: "+9647700000000",
  displayPhone: "+964 770 000 0000",
  address: "بغداد، العراق",
  location: "بغداد، العراق",
  workingHours: "يومياً من 10 صباحاً حتى 10 مساءً",
  deliveryInfo: "توصيل سريع لجميع محافظات العراق خلال 1-3 أيام",
  freeDeliveryThreshold: 50000,
  deliveryBasraCity: 4000
};

export const GOVERNORATES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "نينوى", "كركوك", "ديالى", "الأنبار", "بابل", "كربلاء", "النجف", "الديوانية", "واسط", "ميسان", "ذي قار", "المثنى", "صلاح الدين"
];

export const CATEGORIES: Category[] = [
  { id: 'all', name: 'جميع المنتجات', enName: 'All Products', iconName: 'LayoutGrid', description: 'استعرض جميع منتجات كوزمتك الملكة الأصلية' },
  { id: 'bestsellers', name: 'الأكثر مبيعاً', enName: 'Best Sellers', iconName: 'Flame', description: 'المنتجات الأكثر طلباً وإقبالاً' },
  { id: 'offers', name: 'العروض الخاصة', enName: 'Special Offers', iconName: 'Gift', description: 'خصومات وعروض مميزة' },
  { 
    id: 'عناية', 
    name: 'عناية وتجميل', 
    enName: 'Care & Beauty', 
    iconName: 'Sparkles', 
    description: 'منتجات العناية بالبشرة، الجسم، الشعر والعطور الأصلية',
    subCategories: [
      { id: 'all', name: 'الكل' },
      { id: 'عناية بالبشرة', name: 'عناية بالبشرة' },
      { id: 'عطور ومعطرات', name: 'عطور ومعطرات' },
      { id: 'عناية بالجسم', name: 'عناية بالجسم' },
      { id: 'عناية بالشعر', name: 'عناية بالشعر' }
    ]
  }
];

export const products: Product[] = [
`;

for (let i = 0; i < analyzed.length; i++) {
  const p = analyzed[i];
  tsContent += `  {
    id: ${JSON.stringify(p.id)},
    name: ${JSON.stringify(p.name)},
    enName: ${JSON.stringify(p.enName || '')},
    brand: ${JSON.stringify(p.brand || 'كوزمتك الملكة')},
    category: ${JSON.stringify(p.category || 'عناية')},
    subCategory: ${JSON.stringify(p.subCategory || 'عناية بالجسم')},
    price: ${p.price || 6000},
    originalPrice: ${p.originalPrice || 8000},
    image: ${JSON.stringify(p.image)},
    volumeOrWeight: ${JSON.stringify(p.volumeOrWeight || '')},
    description: ${JSON.stringify(p.description || 'منتج أصلي عالي الجودة متوفر لدى كوزمتك الملكة.')},
    inStock: ${p.inStock !== false},
    isBestSeller: ${Boolean(p.isBestSeller)},
    isOffer: ${Boolean(p.isOffer)}
  }${i < analyzed.length - 1 ? ',' : ''}\n`;
}

tsContent += `];

export const PRODUCTS = products;

export const getStoredProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem('queen_cosmetics_products');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return products;
};

export const saveStoredProducts = (prods: Product[]) => {
  try {
    localStorage.setItem('queen_cosmetics_products', JSON.stringify(prods));
  } catch (e) {}
};

export const governorateDelivery: GovernorateDelivery[] = [
  { name: "بغداد", fee: 4000, estimatedDays: "1-2 أيام" },
  { name: "البصرة", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "أربيل", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "السليمانية", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "دهوك", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "نينوى", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "كركوك", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "ديالى", fee: 4000, estimatedDays: "2-3 أيام" },
  { name: "الأنبار", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "بابل", fee: 4000, estimatedDays: "1-2 أيام" },
  { name: "كربلاء", fee: 4000, estimatedDays: "1-2 أيام" },
  { name: "النجف", fee: 4000, estimatedDays: "1-2 أيام" },
  { name: "الديوانية", fee: 4000, estimatedDays: "2-3 أيام" },
  { name: "واسط", fee: 4000, estimatedDays: "2-3 أيام" },
  { name: "ميسان", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "ذي قار", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "المثنى", fee: 5000, estimatedDays: "2-3 أيام" },
  { name: "صلاح الدين", fee: 4000, estimatedDays: "2-3 أيام" }
];
`;

fs.writeFileSync(productsTsPath, tsContent, 'utf-8');
console.log("Successfully updated src/data/products.ts with exact provided imageUrls!");
