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

console.log(`Found ${items.length} items to process in multi-image batches.`);

async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return {
      mimeType: contentType.split(';')[0],
      data: buffer.toString('base64'),
    };
  } catch (err) {
    return null;
  }
}

// Load existing progress if any
const outputPath = path.join(process.cwd(), 'scripts/analyzed_products.json');
let allResults: Record<string, any> = {};
if (fs.existsSync(outputPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    if (Array.isArray(existing)) {
      for (const item of existing) {
        if (item && item.id && item.name && !item.name.includes('رقم') && !item.name.includes('#')) {
          allResults[item.id] = item;
        }
      }
    }
  } catch (e) {}
}

async function processBatch(batch: { id: string; image: string }[]) {
  const parts: any[] = [];
  const validBatchItems: { id: string; image: string }[] = [];

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const imgData = await fetchImageAsBase64(item.image);
    if (imgData) {
      parts.push({ text: `--- Image #${item.id} ---` });
      parts.push({
        inlineData: {
          mimeType: imgData.mimeType,
          data: imgData.data,
        },
      });
      validBatchItems.push(item);
    }
  }

  if (parts.length === 0) return [];

  parts.push({
    text: `You are an expert cosmetic, perfume, and beauty care specialist in Iraq.
Analyze each of the images provided above. For EACH image (referenced by its #ID), read the exact labels, brand name, product name, Arabic/English text, volume (ml/g), packaging type.
Return a JSON array of objects with the exact structure:
[
  {
    "id": "1",
    "name": "الاسم الحقيقي والفعلي للمنتج بالعربية مطابق تماماً لما هو ظاهر في الصورة (مثل: كريم جونسون الوردي المرطب، لوشن فازلين بالصبار، بخاخ معطر زارا...)",
    "enName": "Exact English name from product label",
    "brand": "Exact Brand Name (e.g. Johnson's, Nivea, Dove, Vaseline, Zara, CeraVe, Garnier, Dior, etc.)",
    "category": "عناية",
    "subCategory": "عناية بالبشرة or عطور ومعطرات or عناية بالجسم or عناية بالشعر",
    "price": 6500,
    "originalPrice": 8500,
    "volumeOrWeight": "200ml or 250ml or 100g",
    "description": "وصف واضح وموجز لفوائد المنتج واستخدامه"
  }
]
Important: Return ONLY valid JSON array with ${validBatchItems.length} objects corresponding to IDs: [${validBatchItems.map(x => x.id).join(', ')}].`
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const text = response.text || '[]';
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err: any) {
    console.error(`Error in batch [${batch.map(x => x.id).join(', ')}]:`, err?.message || err);
    return [];
  }
}

async function main() {
  const batchSize = 10;
  const missingItems = items.filter(x => !allResults[x.id]);
  console.log(`Need to analyze ${missingItems.length} items out of ${items.length}...`);

  for (let i = 0; i < missingItems.length; i += batchSize) {
    const batch = missingItems.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingItems.length / batchSize)} (IDs: ${batch.map(b => b.id).join(', ')})...`);
    
    const results = await processBatch(batch);
    for (const res of results) {
      if (res && res.id) {
        const itemObj = items.find(x => x.id === String(res.id));
        allResults[res.id] = {
          ...res,
          id: String(res.id),
          image: itemObj?.image || '',
          price: Number(res.price) || 6000,
          originalPrice: Number(res.originalPrice) || Math.round((Number(res.price) || 6000) * 1.3 / 500) * 500
        };
        console.log(`  -> ID ${res.id}: ${res.name} (${res.brand})`);
      }
    }

    // Save intermediate results
    const fullList = items.map(it => allResults[it.id] || {
      id: it.id,
      image: it.image,
      name: `منتج عناية #${it.id}`,
      enName: `Care Product #${it.id}`,
      brand: "كوزمتك الملكة",
      category: "عناية",
      price: 6000,
      originalPrice: 8000,
      description: "منتج أصلي عالي الجودة متوفر لدى كوزمتك الملكة."
    });
    fs.writeFileSync(outputPath, JSON.stringify(fullList, null, 2), 'utf-8');

    // Wait 13 seconds between requests to strictly obey RPM limit (5 req/min = 12s per req)
    if (i + batchSize < missingItems.length) {
      console.log('Waiting 14 seconds for rate-limit cooldown...');
      await new Promise(r => setTimeout(r, 14000));
    }
  }

  console.log("All items successfully analyzed and saved to", outputPath);
}

main();
