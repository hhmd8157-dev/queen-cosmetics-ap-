import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), 'scripts/analyzed_lite_products.json');
if (!fs.existsSync(jsonPath)) {
  console.error("Analyzed json not found");
  process.exit(1);
}

const analyzed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

let tsContent = `import { Category, GovernorateDelivery, CategoryId } from "../types";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  imageName?: string;
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
  const imageName = p.imageName || `${p.name}.jpg`;
  tsContent += `  {
    id: ${JSON.stringify(p.id)},
    name: ${JSON.stringify(p.name)},
    enName: ${JSON.stringify(p.enName || '')},
    brand: ${JSON.stringify(p.brand || 'كوزمتك الملكة')},
    category: ${JSON.stringify(p.category || 'عناية')},
    subCategory: ${JSON.stringify(p.subCategory || 'عناية بالجسم')},
    price: ${p.price || 6000},
    originalPrice: ${p.originalPrice || 8000},
    imageName: ${JSON.stringify(imageName)},
    image: ${JSON.stringify(imageName)},
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

fs.writeFileSync(path.join(process.cwd(), 'src/data/products.ts'), tsContent, 'utf-8');
console.log("Updated products.ts successfully!");
