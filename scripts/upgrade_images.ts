import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), 'scripts/analyzed_lite_products.json');
const productsTsPath = path.join(process.cwd(), 'src/data/products.ts');

if (!fs.existsSync(jsonPath)) {
  console.error("No analyzed_lite_products.json found!");
  process.exit(1);
}

const analyzed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const skincarePool = [
  'https://images.unsplash.com/photo-1556228720-195a672e8a03',
  'https://images.unsplash.com/photo-1608248597359-9943b1aa079a',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
  'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d',
  'https://images.unsplash.com/photo-1556228722-195a672e8a03',
  'https://images.unsplash.com/photo-1512290900722-9a702082b2d5'
];

const bodyPool = [
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be',
  'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d',
  'https://images.unsplash.com/photo-1512290900722-9a702082b2d5',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
  'https://images.unsplash.com/photo-1519735777090-ec97162dc266'
];

const perfumePool = [
  'https://images.unsplash.com/photo-1523293182086-7651a899d37f',
  'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539',
  'https://images.unsplash.com/photo-1547887537-6158d64c35b3',
  'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75',
  'https://images.unsplash.com/photo-1615397349754-cfa2066a298e',
  'https://images.unsplash.com/photo-1563178406-4cdc2923acbc',
  'https://images.unsplash.com/photo-1594035910387-fea47794261f',
  'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d'
];

const hairPool = [
  'https://images.unsplash.com/photo-1526947425960-945c6e72858f',
  'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d',
  'https://images.unsplash.com/photo-1519735777090-ec97162dc266',
  'https://images.unsplash.com/photo-1608248597359-9943b1aa079a'
];

for (let i = 0; i < analyzed.length; i++) {
  const p = analyzed[i];
  const nameLower = (p.name || '').toLowerCase();
  const subLower = (p.subCategory || '').toLowerCase();
  
  let chosenUrl = skincarePool[i % skincarePool.length];
  if (nameLower.includes('عطر') || nameLower.includes('مسك') || nameLower.includes('بخور') || nameLower.includes('معطر') || nameLower.includes('عود') || nameLower.includes('مخمرية') || subLower.includes('عطور')) {
    chosenUrl = perfumePool[i % perfumePool.length];
  } else if (nameLower.includes('شعر') || nameLower.includes('شامبو') || nameLower.includes('زيت') || subLower.includes('شعر')) {
    chosenUrl = hairPool[i % hairPool.length];
  } else if (nameLower.includes('لوشن') || nameLower.includes('جسم') || subLower.includes('جسم')) {
    chosenUrl = bodyPool[i % bodyPool.length];
  }

  // Ensure exact parameter format requested by user: ?auto=format&fit=crop&w=1000&q=100
  p.image = `${chosenUrl}?auto=format&fit=crop&w=1000&q=100`;
}

// Save back to JSON
fs.writeFileSync(jsonPath, JSON.stringify(analyzed, null, 2), 'utf-8');

// Now generate src/data/products.ts
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

// قائمة المنتجات الـ 103 الحقيقية مع صور عالية الدقة HD (1000x1000)
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
console.log("Successfully upgraded all product images to HD (1000x1000) with ?auto=format&fit=crop&w=1000&q=100 parameters!");
