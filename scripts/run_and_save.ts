import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const logFile = path.join(process.cwd(), 'scripts/log.txt');
function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n', 'utf-8');
}

fs.writeFileSync(logFile, 'Starting run_and_save...\n', 'utf-8');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  log("ERROR: No GEMINI_API_KEY found!");
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

log(`Total items found: ${items.length}`);

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
  const outputPath = path.join(process.cwd(), 'scripts/analyzed_products.json');
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

  const batchSize = 10;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const needProcess = batch.filter(x => !resultsMap[x.id]);
    if (needProcess.length === 0) {
      log(`Batch ${i / batchSize + 1} already done.`);
      continue;
    }

    log(`Processing batch ${i / batchSize + 1}/${Math.ceil(items.length / batchSize)} (IDs: ${needProcess.map(x => x.id).join(', ')})...`);

    const parts: any[] = [];
    const valid: typeof batch = [];

    for (const item of needProcess) {
      const b64 = await fetchImageAsBase64(item.image);
      if (b64) {
        parts.push({ text: `--- Image #${item.id} ---` });
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: b64,
          },
        });
        valid.push(item);
      }
    }

    if (valid.length === 0) continue;

    parts.push({
      text: `Identify each beauty/cosmetic/skincare product image by its ID.
Read the EXACT Arabic & English text, brand, and type on the packaging.
Return a JSON array:
[
  {
    "id": "1",
    "name": "اسم المنتج الحقيقي بالعربية مطابق 100% للصورة",
    "enName": "Exact English Name",
    "brand": "Brand name",
    "category": "عناية",
    "subCategory": "عناية بالبشرة or عطور ومعطرات or عناية بالجسم or عناية بالشعر",
    "price": 6000,
    "originalPrice": 8000,
    "volumeOrWeight": "200ml",
    "description": "وصف واضح للمنتج واستخدامه"
  }
]`
    });

    try {
      log(`Calling Gemini for ${valid.length} images...`);
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
        for (const item of parsed) {
          if (item && item.id) {
            const rawItem = items.find(x => x.id === String(item.id));
            resultsMap[item.id] = {
              ...item,
              id: String(item.id),
              image: rawItem?.image || '',
              price: Number(item.price) || 6000,
              originalPrice: Number(item.originalPrice) || Math.round((Number(item.price) || 6000) * 1.3 / 500) * 500
            };
            log(`  [OK] ID ${item.id}: ${item.name} (${item.brand}) - ${item.price} IQD`);
          }
        }
      }
    } catch (err: any) {
      log(`  [ERR] Batch failed: ${err?.message || err}`);
    }

    // Save full list
    const fullList = items.map(it => resultsMap[it.id] || {
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

    log(`Saved ${Object.keys(resultsMap).length} identified items so far.`);
    log('Waiting 14s cooldown...');
    await new Promise(r => setTimeout(r, 14000));
  }

  log('ALL DONE!');
}

run().catch(err => log(`FATAL: ${err}`));
