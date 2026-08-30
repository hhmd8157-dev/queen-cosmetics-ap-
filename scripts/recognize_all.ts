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

const productsFilePath = path.join(process.cwd(), 'src/data/products.ts');
const fileContent = fs.readFileSync(productsFilePath, 'utf-8');

const regex = /id:\s*"(\d+)",[\s\S]*?image:\s*"(https:\/\/i\.ibb\.co\/[^"]+)"/g;
const items: { id: string; image: string }[] = [];
let match;
while ((match = regex.exec(fileContent)) !== null) {
  items.push({ id: match[1], image: match[2] });
}

console.log(`Found ${items.length} product images to accurately recognize.`);

async function fetchImageAsBase64(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (err) {
    return null;
  }
}

const outputPath = path.join(process.cwd(), 'scripts/recognized_products.json');
let recognizedMap: Record<string, any> = {};
if (fs.existsSync(outputPath)) {
  try {
    recognizedMap = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  } catch (e) {}
}

async function analyzeSingle(item: { id: string; image: string }, retries = 3) {
  if (recognizedMap[item.id] && recognizedMap[item.id].name && !recognizedMap[item.id].name.includes('منتج عناية #')) {
    return recognizedMap[item.id];
  }

  const b64 = await fetchImageAsBase64(item.image);
  if (!b64) {
    console.error(`Failed to download image for ID ${item.id}`);
    return null;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: b64 } },
              {
                text: `Analyze this beauty / cosmetics / skincare / haircare / fragrance / body care product image accurately.
Read all text, brand names, product titles, volume/size (ml/g), and specific variant written on the packaging.
Output ONLY a JSON object in this exact schema:
{
  "id": "${item.id}",
  "name": "اسم المنتج الحقيقي والواضح بالعربية مطابق تماماً للصورة والماركة المكتوبة عليها",
  "enName": "Exact product name in English from the packaging",
  "brand": "Exact brand name (e.g. Dr. Lana, Johnson's, Nivea, Dove, Vaseline, Garnier, CeraVe, OGX, Beesline, Gillette, Old Spice, etc.)",
  "category": "عناية",
  "subCategory": "عناية بالبشرة / عطور ومعطرات / عناية بالجسم / عناية بالشعر",
  "price": 6000,
  "originalPrice": 8000,
  "volumeOrWeight": "e.g. 200ml or 150ml or 100g",
  "description": "وصف جذاب ومختصر لمميزات واستخدامات هذا المنتج بالتحديد"
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
      
      const result = {
        id: item.id,
        name: parsed.name || `منتج ${item.id}`,
        enName: parsed.enName || '',
        brand: parsed.brand || 'كوزمتك الملكة',
        category: parsed.category || 'عناية',
        subCategory: parsed.subCategory || 'عناية بالجسم',
        price: Number(parsed.price) || 6000,
        originalPrice: Number(parsed.originalPrice) || Math.round((Number(parsed.price) || 6000) * 1.3 / 500) * 500,
        volumeOrWeight: parsed.volumeOrWeight || '',
        description: parsed.description || 'منتج أصلي عالي الجودة للعناية والجمال.',
        image: item.image
      };

      console.log(`[${item.id}/103] ✓ ${result.name} | Brand: ${result.brand} | ${result.volumeOrWeight}`);
      recognizedMap[item.id] = result;
      fs.writeFileSync(outputPath, JSON.stringify(recognizedMap, null, 2), 'utf-8');
      return result;
    } catch (e: any) {
      console.warn(`[${item.id}] Attempt ${attempt + 1} failed: ${e?.message?.slice(0, 100)}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function main() {
  console.log("Starting batch processing with gemini-3.1-flash-lite...");
  // Run with concurrency 4
  const concurrency = 4;
  const queue = [...items];
  
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await analyzeSingle(item);
      await new Promise(r => setTimeout(r, 500)); // smooth pacing
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log("Recognition complete! Total recognized:", Object.keys(recognizedMap).length);
}

main().catch(console.error);
