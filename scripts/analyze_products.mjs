import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const productsDir = path.join(process.cwd(), 'public', 'products');
const files = fs.readdirSync(productsDir).filter(f => !f.endsWith('.txt'));

console.log(`Found ${files.length} product images.`);

function extractPriceFromFilename(filename) {
  if (filename.includes('35 الف')) return 35000;
  if (filename.includes('30 الف') || filename.includes('30 الاف')) return 30000;
  if (filename.includes('24 الف') || filename.includes('24 الاف')) return 24000;
  if (filename.includes('20 الف') || filename.includes('20 الاف')) return 20000;
  if (filename.includes('18 الف') || filename.includes('18 الاف')) return 18000;
  if (filename.includes('15 الف') || filename.includes('15 الاف')) return 15000;
  if (filename.includes('10 الف') || filename.includes('10 الاف')) return 10000;
  if (filename.includes('8 الاف') || filename.includes('8 الف')) return 8000;
  if (filename.includes('7 الاف') || filename.includes('7 الف')) return 7000;
  if (filename.includes('6 الاف') || filename.includes('6 الف')) return 6000;
  if (filename.includes('5 الاف') || filename.includes('5 الف') || filename.includes('سعره 5') || filename.includes('همين5') || filename.includes('همسن')) return 5000;
  if (filename.includes('4 الاف') || filename.includes('4 الف')) return 4000;
  if (filename.includes('3 الاف') || filename.includes('3 الف') || filename.includes('3 الوف')) return 3000;
  return 5000;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.avif') return 'image/avif';
  return 'image/jpeg';
}

async function analyzeImage(filename, index) {
  const filePath = path.join(productsDir, filename);
  const data = fs.readFileSync(filePath);
  const base64Data = data.toString('base64');
  const mimeType = getMimeType(filename);
  const defaultPrice = extractPriceFromFilename(filename);

  const prompt = `You are an expert Iraqi cosmetics & perfumery store cataloger for "Queen Cosmetics".
Examine this product image carefully.
Read any text on the bottle/box/packaging (brand name, product type, variant, ingredients).

Return ONLY valid JSON (no markdown ticks, no backticks, just raw JSON) matching this exact format:
{
  "name": "اسم المنتج الحقيقي والواضح بالعربي مع اسم البراند والنوع بدقة بالغة (مثلاً: مزيل عرق أولد سبايس بيور سبورت رجالي / شامبو فاتيكا بالثوم لتقوية الشعر / عطر 9PM أفنان الأصلي / لوشن فازلين بالكاكاو للعناية المركزة / غسول وجه سيمبل للبشرة الحساسة / كريم جليسوليد الأحمر الأصلي)",
  "brand": "اسم الماركة بالإنجليزية أو العربية (مثل Nivea, Old Spice, Vaseline, Vatika, Eucerin, Dove, Johnson's, Gillette)",
  "category": "One of: 'skincare' | 'haircare' | 'body_sprays_deo' | 'perfumes' | 'bakhoor'",
  "subCategory": "One of: 'creams_lotions' | 'face_cleansers' | 'hair_shampoo_oils' | 'deodorants_sprays' | 'perfumes' | 'bakhoor_oud' | 'bath_body'",
  "volumeOrWeight": "الحجم أو الوزن إذا ظهر على العلبة (مثلاً 250ml أو 50g أو 100ml) أو فارغ",
  "description": "وصف جذاب ومختصر ومفيد للمنتج باللغة العربية بلهجة تسويقية راقية سطرين",
  "benefits": ["فائدة 1", "فائدة 2", "فائدة 3"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        }
      ]
    });

    let text = response.text || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    return {
      id: String(index + 1),
      name: parsed.name,
      brand: parsed.brand || '',
      category: parsed.category || 'skincare',
      subCategory: parsed.subCategory || 'creams_lotions',
      price: defaultPrice,
      originalPrice: defaultPrice + Math.round(defaultPrice * 0.2 / 1000) * 1000,
      image: filename,
      imageName: filename,
      description: parsed.description || '',
      benefits: parsed.benefits || [],
      volumeOrWeight: parsed.volumeOrWeight || '',
      inStock: true,
      stockCount: Math.floor(Math.random() * 20) + 10,
      rating: +(4.5 + Math.random() * 0.5).toFixed(1),
      reviewCount: Math.floor(Math.random() * 40) + 12
    };
  } catch (err) {
    console.error(`Error processing ${filename}:`, err.message);
    return {
      id: String(index + 1),
      name: `منتج عناية وتجميل ${index + 1}`,
      brand: 'Queen Cosmetics',
      category: 'skincare',
      price: defaultPrice,
      image: filename,
      imageName: filename,
      inStock: true
    };
  }
}

async function run() {
  const results = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i + 1} to ${Math.min(i + BATCH_SIZE, files.length)} of ${files.length}...`);
    const batchResults = await Promise.all(
      batch.map((file, idx) => analyzeImage(file, i + idx))
    );
    results.push(...batchResults);
    // brief delay between batches to respect rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  const outputPath = path.join(process.cwd(), 'scripts', 'analyzed_products.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Successfully saved ${results.length} products to ${outputPath}`);
}

run();
