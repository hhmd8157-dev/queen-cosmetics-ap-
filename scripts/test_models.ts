import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const url1 = "https://i.ibb.co/GvSCyJ2G/image.jpg";
  const res1 = await fetch(url1);
  const buf1 = Buffer.from(await res1.arrayBuffer()).toString('base64');

  const modelsToTest = ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-flash-latest', 'gemini-3.7-flash'];
  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: buf1 } },
              { text: "What exact product is shown in this image? Give brand and product name." }
            ]
          }
        ]
      });
      console.log(`[SUCCESS] ${m} responded:`, response.text);
      break;
    } catch (e: any) {
      console.log(`[FAILED] ${m}:`, e?.message?.slice(0, 150));
    }
  }
}

test();
