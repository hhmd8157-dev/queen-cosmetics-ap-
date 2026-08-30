import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No GEMINI_API_KEY found!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Read products from src/data/products.ts to get all 103 items
const productsFilePath = path.join(process.cwd(), 'src/data/products.ts');
const fileContent = fs.readFileSync(productsFilePath, 'utf-8');

// Extract id and image url pairs
const regex = /id:\s*"(\d+)",[\s\S]*?image:\s*"(https:\/\/i\.ibb\.co\/[^"]+)"/g;
const items: { id: string; image: string }[] = [];
let match;
while ((match = regex.exec(fileContent)) !== null) {
  items.push({ id: match[1], image: match[2] });
}

console.log(`Found ${items.length} items to analyze.`);

async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch ${url}: ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return {
      mimeType: contentType.split(';')[0],
      data: buffer.toString('base64'),
    };
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return null;
  }
}

async function analyzeItem(item: { id: string; image: string }, retries = 3) {
  const imgData = await fetchImageAsBase64(item.image);
  if (!imgData) {
    return {
      id: item.id,
      image: item.image,
      name: `منتج تجميل وعناية رقم ${item.id}`,
      enName: `Beauty & Care Product ${item.id}`,
      brand: "كوزمتك الملكة",
      category: "عناية",
      price: 6000,
      originalPrice: 8000,
      description: "منتج عناية وتجميل أصلي عالي الجودة متوفر لدى كوزمتك الملكة."
    };
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: imgData.mimeType,
                  data: imgData.data,
                },
              },
              {
                text: `Analyze this cosmetic/perfume/skincare product image carefully.
Read the exact visible text, brand logo, Arabic/English name, volume (ml/g), packaging details.
Return ONLY valid JSON with these fields:
{
  "name": "الاسم الحقيقي والدقيق للمنتج بالعربية مطابق تماماً للصورة (مثلاً: كريم جونسون المرطب، أو زيت فازلين بالصبار، أو معطر زارا...)",
  "enName": "Accurate English name from the packaging",
  "brand": "Exact brand name (e.g., Johnson's, Nivea, Dove, CeraVe, Zara, Vaseline, Garnier, OGX, Beesline, Gillette, Old Spice, etc.)",
  "category": "عناية",
  "subCategory": "عناية بالبشرة or عطور ومعطرات or عناية بالجسم or عناية بالشعر",
  "price": 6000 (realistic Iraqi Dinar price in IQD like 4000, 5000, 6000, 7000, 8000, 9000, 10000, 12000, 15000),
  "originalPrice": 8000,
  "volumeOrWeight": "e.g. 200ml, 250ml, 500ml, 100g",
  "description": "وصف واضح ومختصر للمنتج وفوائده بالعربية"
}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const text = response.text || '{}';
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      console.log(`[Item #${item.id}] Identified: ${parsed.name} (${parsed.brand})`);
      return {
        id: item.id,
        image: item.image,
        name: parsed.name || `منتج عناية #${item.id}`,
        enName: parsed.enName || '',
        brand: parsed.brand || 'كوزمتك الملكة',
        category: parsed.category || 'عناية',
        subCategory: parsed.subCategory || 'عناية بالجسم',
        price: Number(parsed.price) || 6000,
        originalPrice: Number(parsed.originalPrice) || Math.round((Number(parsed.price) || 6000) * 1.3 / 500) * 500,
        volumeOrWeight: parsed.volumeOrWeight || '',
        description: parsed.description || 'منتج أصلي عالي الجودة للعناية والجمال.'
      };
    } catch (e) {
      console.error(`Attempt ${attempt + 1} failed for id ${item.id}:`, e);
      if (attempt === retries - 1) {
        return {
          id: item.id,
          image: item.image,
          name: `منتج عناية فاخر #${item.id}`,
          enName: `Luxury Care Product #${item.id}`,
          brand: "كوزمتك الملكة",
          category: "عناية",
          price: 6500,
          originalPrice: 8500,
          description: "منتج أصلي متوفر لدى كوزمتك الملكة."
        };
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function run() {
  const results = [];
  const batchSize = 10;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing items ${i + 1} to ${Math.min(i + batchSize, items.length)} of ${items.length}...`);
    const batchResults = await Promise.all(batch.map(item => analyzeItem(item)));
    results.push(...batchResults);
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'scripts/analyzed_products.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log("Finished analyzing all products! Saved to scripts/analyzed_products.json");
}

run();
