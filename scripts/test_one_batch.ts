import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const url1 = "https://i.ibb.co/GvSCyJ2G/image.jpg";
  const url2 = "https://i.ibb.co/N63j37MS/image.jpg";
  
  const res1 = await fetch(url1);
  const buf1 = Buffer.from(await res1.arrayBuffer()).toString('base64');
  
  const res2 = await fetch(url2);
  const buf2 = Buffer.from(await res2.arrayBuffer()).toString('base64');

  console.log("Images fetched. Calling Gemini...");
  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: "Image 1:" },
          { inlineData: { mimeType: 'image/jpeg', data: buf1 } },
          { text: "Image 2:" },
          { inlineData: { mimeType: 'image/jpeg', data: buf2 } },
          { text: "Identify the exact product names, brands, and prices in Iraqi Dinars for each image. Return JSON: [{id: '1', name: '...', brand: '...'}, {id: '2', name: '...', brand: '...'}]" }
        ]
      }
    ]
  });

  console.log("Gemini Response:", response.text);
}

test().catch(console.error);
