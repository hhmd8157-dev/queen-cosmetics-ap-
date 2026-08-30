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

const outputPath = path.join(process.cwd(), 'scripts/analyzed_lite_products.json');
let resultsMap: Record<string, any> = {};

if (fs.existsSync(outputPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    if (Array.isArray(existing)) {
      for (const it of existing) {
        if (it.id && it.name && !it.name.includes('#')) {
          resultsMap[it.id] = it;
        }
      }
    }
  } catch (e) {}
}

console.log(`Loaded ${Object.keys(resultsMap).length} already identified items.`);

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

async function run() {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (resultsMap[item.id] && !resultsMap[item.id].name.includes('#')) {
      continue;
    }

    console.log(`[Item #${item.id} (${i + 1}/${items.length})] Analyzing ${item.image}...`);
    const b64 = await fetchImageAsBase64(item.image);
    if (!b64) {
      console.error(`Failed to fetch image for ID ${item.id}`);
      continue;
    }

    let success = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: b64 } },
                {
                  text: `Analyze this cosmetic/perfume/skincare product image carefully. Read the exact text, brand name, product name, volume, and type shown on the packaging.
Return ONLY valid JSON (no markdown fences) with these exact fields:
{
  "name": "الاسم الدقيق للمنتج بالعربية مطابق تماماً للصورة (مثلاً: كريم جونسون، زيت فازلين، عطر زارا، صابون دوف...)",
  "enName": "Exact English name from packaging",
  "brand": "Brand name (e.g., Johnson's, Nivea, Dove, CeraVe, Vaseline, Garnier, Zara, etc.)",
  "category": "عناية",
  "subCategory": "عناية بالبشرة or عطور ومعطرات or عناية بالجسم or عناية بالشعر",
  "price": 6000,
  "originalPrice": 8000,
  "volumeOrWeight": "200ml",
  "description": "وصف قصير ومفيد للمنتج بالعربية"
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

        resultsMap[item.id] = {
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
          description: parsed.description || 'منتج أصلي عالي الجودة متوفر لدى كوزمتك الملكة.',
          inStock: true,
          isBestSeller: i % 7 === 0,
          isOffer: i % 5 === 0
        };

        console.log(`  -> [SUCCESS] ID ${item.id}: ${resultsMap[item.id].name} (${resultsMap[item.id].brand})`);
        success = true;
        break;
      } catch (err: any) {
        const errStr = err?.message || String(err);
        if (errStr.includes('429') || errStr.includes('ResourceExhausted') || errStr.includes('quota')) {
          console.log(`  -> Rate limit hit on attempt ${attempt} for ID ${item.id}. Waiting 60 seconds...`);
          await new Promise(r => setTimeout(r, 62000));
        } else {
          console.error(`  -> Attempt ${attempt} failed for ID ${item.id}:`, errStr.slice(0, 100));
          await new Promise(r => setTimeout(r, 3000 * attempt));
        }
      }
    }

    if (!success) {
      resultsMap[item.id] = {
        id: item.id,
        image: item.image,
        name: `منتج عناية #${item.id}`,
        enName: `Care Product #${item.id}`,
        brand: "كوزمتك الملكة",
        category: "عناية",
        price: 6000,
        originalPrice: 8000,
        description: "منتج أصلي عالي الجودة متوفر لدى كوزمتك الملكة.",
        inStock: true
      };
    }

    // Save progress
    const fullList = items.map(it => resultsMap[it.id] || {
      id: it.id,
      image: it.image,
      name: `منتج عناية #${it.id}`,
      enName: `Care Product #${it.id}`,
      brand: "كوزمتك الملكة",
      category: "عناية",
      price: 6000,
      originalPrice: 8000,
      description: "منتج أصلي عالي الجودة متوفر لدى كوزمتك الملكة.",
      inStock: true
    });
    fs.writeFileSync(outputPath, JSON.stringify(fullList, null, 2), 'utf-8');

    // Wait 4.5 seconds between requests (safely under 15 requests per minute)
    await new Promise(r => setTimeout(r, 4500));
  }

  console.log("Patient identification complete! Saved to", outputPath);
}

run().catch(console.error);
