import fs from 'fs';
import path from 'path';

const publicProductsDir = path.join(process.cwd(), 'public', 'products');
if (!fs.existsSync(publicProductsDir)) {
  fs.mkdirSync(publicProductsDir, { recursive: true });
  console.log("Created /public/products/ directory successfully.");
}

const publicImagesDir = path.join(process.cwd(), 'public', 'images');
const jsonPath = path.join(process.cwd(), 'scripts/analyzed_lite_products.json');

if (!fs.existsSync(jsonPath)) {
  console.error("No analyzed_lite_products.json found!");
  process.exit(1);
}

const analyzed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Minimal valid 1x1 JPEG buffer as fallback if physical image doesn't exist
const dummyJpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
  0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
  0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
  0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
  0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
  0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
  0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
  0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
  0x00, 0x00, 0x3f, 0x00, 0xfd, 0x27, 0xff, 0xd9
]);

for (let i = 0; i < analyzed.length; i++) {
  const p = analyzed[i];
  const cleanName = (p.name || `product_${p.id}`).replace(/[/\\?%*:|"<>]/g, '_');
  const imageName = `${cleanName}.jpg`;
  p.imageName = imageName;
  p.image = `/products/${encodeURIComponent(imageName)}`;

  const destPath = path.join(publicProductsDir, imageName);
  const srcPath = fs.existsSync(path.join(publicImagesDir, imageName)) 
    ? path.join(publicImagesDir, imageName) 
    : null;

  if (srcPath) {
    fs.copyFileSync(srcPath, destPath);
  } else if (!fs.existsSync(destPath)) {
    fs.writeFileSync(destPath, dummyJpegBuffer);
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(analyzed, null, 2), 'utf-8');

// Generate src/data/products.ts
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
  const imageName = p.imageName;
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
    image: \`/products/\${encodeURIComponent(${JSON.stringify(imageName)})}\`,
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

const productsTsPath = path.join(process.cwd(), 'src/data/products.ts');
fs.writeFileSync(productsTsPath, tsContent, 'utf-8');
console.log("Successfully set up /public/products/ and updated products.ts!");
