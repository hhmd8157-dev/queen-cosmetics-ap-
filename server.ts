import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  sendTelegramNotification,
  getTelegramConfig,
  saveTelegramConfig,
  syncTelegramChats,
  sendTestTelegramMessage,
  sendStockAlertTelegramNotification,
  sendChatMessageTelegramNotification,
  getBotMe,
} from "./server/telegram";
import { queueEmailNotification } from "./server/mailer";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

// Orders file path
const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const STOCK_ALERTS_FILE = path.join(DATA_DIR, "stock_alerts.json");
const CHATS_FILE = path.join(DATA_DIR, "chats.json");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");

interface OrderRecord {
  id: string;
  trackingCode: string;
  items: any[];
  customer: {
    name: string;
    phone: string;
    governorate: string;
    district?: string;
    nearestLandmark?: string;
    houseDetails?: string;
    address: string;
    notes?: string;
  };
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  couponCode?: string;
  total: number;
  deliveryTiming: string;
  customTimingText?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapUrl: string;
    isPinnedManually?: boolean;
    district?: string;
    nearestLandmark?: string;
  };
  status: 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  createdAt: string;
  statusUpdatedAt: string;
  driverNotes?: string;
}

interface StockAlertRecord {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productPrice: number;
  productImage: string;
  customerPhone: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
  notified?: boolean;
}

interface ChatMessageRecord {
  id: string;
  orderId: string;
  sender: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  readByAdmin: boolean;
  readByCustomer: boolean;
}

interface ProductReviewRecord {
  id: string;
  productId: string;
  authorName: string;
  governorate?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedPurchase?: boolean;
  likes?: number;
}

// In-memory caches
let ordersCache: OrderRecord[] = [];
let stockAlertsCache: StockAlertRecord[] = [];
let chatsCache: ChatMessageRecord[] = [];
let reviewsCache: ProductReviewRecord[] = [];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Reviews cache init
  if (fs.existsSync(REVIEWS_FILE)) {
    try {
      const data = fs.readFileSync(REVIEWS_FILE, "utf8");
      reviewsCache = JSON.parse(data);
    } catch (e) {
      reviewsCache = [];
    }
  } else {
    reviewsCache = [];
    fs.writeFileSync(REVIEWS_FILE, "[]", "utf8");
  }

  // Stock alerts cache init
  if (fs.existsSync(STOCK_ALERTS_FILE)) {
    try {
      const data = fs.readFileSync(STOCK_ALERTS_FILE, "utf8");
      stockAlertsCache = JSON.parse(data);
    } catch (e) {
      stockAlertsCache = [];
    }
  } else {
    stockAlertsCache = [];
    fs.writeFileSync(STOCK_ALERTS_FILE, "[]", "utf8");
  }

  // Chats cache init
  if (fs.existsSync(CHATS_FILE)) {
    try {
      const data = fs.readFileSync(CHATS_FILE, "utf8");
      chatsCache = JSON.parse(data);
    } catch (e) {
      chatsCache = [];
    }
  } else {
    chatsCache = [];
    fs.writeFileSync(CHATS_FILE, "[]", "utf8");
  }

  if (!fs.existsSync(ORDERS_FILE)) {
    const initialOrders: OrderRecord[] = [];
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(initialOrders, null, 2), "utf8");
    ordersCache = initialOrders;
  } else {
    try {
      const data = fs.readFileSync(ORDERS_FILE, "utf8");
      const loaded = JSON.parse(data);
      // Filter out old sample orders if any exist
      ordersCache = Array.isArray(loaded) ? loaded.filter((o: any) => !o.id?.startsWith('ord-sample-')) : [];
    } catch (e) {
      console.error("Failed to parse orders file, resetting cache:", e);
      ordersCache = [];
    }
  }
}

function saveOrdersToFile() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersCache, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving orders to disk:", err);
  }
}

function saveStockAlertsToFile() {
  try {
    fs.writeFileSync(STOCK_ALERTS_FILE, JSON.stringify(stockAlertsCache, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving stock alerts to disk:", err);
  }
}

function saveChatsToFile() {
  try {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chatsCache, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving chats to disk:", err);
  }
}

function saveReviewsToFile() {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviewsCache, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving reviews to disk:", err);
  }
}

ensureDataDir();

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `
أنت "مستشار كوزمتك الملكة الذكي 🤖" (Queen Cosmetics AI Advisor)، خبير واستشاري التجميل والعناية والعطور الشامل لمتجر "كوزمتك الملكة" في العراق.

--- 1. الهوية والأسلوب والتواصل (Tone & Persona) ---
- تحدّث بأسلوب راقٍ، مهذب، دافئ، ومحبب بصيغة الخطاب العام المحايد والمرحب (مثل: "أهلاً وسهلاً بك في كوزمتك الملكة"، "تدلل / من عيوني"، "نورتنا"، "ولا يهمك").
- تجاوب مع السؤال المطروح بذكاء وسلاسة وسياق مباشر دون تكرار مقدمات جاهزة أو نسخ نفس الفقرات في كل رسالة.
- صياغة ذكية، طبيعية، ومرنة بحسب حاجة الزبون.

--- 2. قواعد المصداقية والأمانة العلمية الصارمة (Strict Scientific Honesty) ---
يمنع منعاً باتاً المبالغة أو إعطاء وعود سحرية أو تسويقية مضللة:
- **البخور والمبسوس**: الثبات والفوحان الواقعي بالمكان من 4 إلى 5 ساعات.
- **لبان الذكر (المسكي والورد - المقروء عليه رقية شرعية)**: الثبات والفوحان الواقعي من 5 إلى 6 ساعات.
- **العطور**: تحديد الثباتية الواقعية حسب التركيز (EDT: 3-5 ساعات، EDP: 6-8 ساعات، Parfum: 8-12 ساعة).
- **العناية بالبشرة والشعر**: توضيح المدة الزمنية الحقيقية (يحتاج الجلد وتجدد الخلايا أو بصيلات الشعر إلى التزام روتيني منتظم من 2 إلى 4 أسابيع لملاحظة فرق ملحوظ ومستدام، ولا توجد حلول سحرية فورية).
- **التوجيه السليم**: تقديم ترتيب خطوات الاستخدام الصحيحة، واختبار الحساسية (Patch Test)، والتأكيد على واقي الشمس نهاراً عند استخدام السيرومات أو المقشرات أو الريتينول، والتحذير من ترك الزيوت المركزة لفترات طويلة على الفروة.

--- 3. المعرفة العالمية الشاملة (Universal Beauty & Fragrance Knowledge) ---
- تمتلك معرفة غير محدودة بجميع الماركات والمنتجات العالمية (CeraVe, The Ordinary, La Roche-Posay, Dior, Chanel, Laneige, COSRX, Anua, K18, Olaplex, إلخ).
- تشرح بوضوح: المكونات الفعالة، نوع البشرة المناسب، طريقة الاستخدام، الفروقات بين المنتج الأصلي والتيستر والمقلد.
- عند ملاءمة السؤال، يمكنك الإشارة بلطف إلى التشكيلات المتوفرة في "كوزمتك الملكة" (العناية، العطور، اللوشن، وخاصية "اصنع خلطة بخورك الخاصة" بسعر 5,000 د.ع للعلبة الذهبية).

--- 4. معلومات متجر كوزمتك الملكة (Store Facts) ---
- الموقع: العراق - البصرة (مع توصيل لكافة المحافظات العراقية).
- أجور التوصيل: مركز البصرة 3,000 د.ع | أقضية البصرة والمحافظات 5,000 د.ع | التوصيل مجاني للطلبات بقيمة 50,000 د.ع فما فوق.
- خدمة العملاء والطلب السريع عبر الواتساب: 07828956749.

نسّق الإجابة بنقاط منسقة ومرتبة باستخدام Markdown عند الحاجة، وركّز دائماً على الإجابة المفيدة والدقيقة للسؤال الحالي مباشرة.
`;

// Models to try in sequence for automatic fallback in case of high demand / 503 errors
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
];

// Real-time Server-Sent Events (SSE) Client Pool for Live Push Notifications
const sseClients: Array<Response> = [];

function broadcastSSEEvent(eventType: string, payload: any) {
  const data = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(data);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Ensure public uploads directory exists and is served statically
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Health check API
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 📷 Product Image Upload endpoint
  app.post("/api/upload-image", (req: Request, res: Response) => {
    try {
      const { image, name } = req.body;
      if (!image || typeof image !== "string" || !image.startsWith("data:")) {
        return res.status(400).json({ error: "Invalid image format" });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 payload" });
      }

      const mimeType = matches[1];
      const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("png") ? "png" : "jpg";
      const sanitizedName = (name || "product")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .substring(0, 30);
      const filename = `${sanitizedName}-${Date.now()}.${extension}`;
      const destPath = path.join(uploadsDir, filename);

      const buffer = Buffer.from(matches[2], "base64");
      fs.writeFileSync(destPath, buffer);

      res.json({ success: true, url: `/uploads/${filename}` });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // 📧 Endpoint for queuing email notifications
  app.post("/api/send-email", async (req, res) => {
    try {
      const { subject, html, to } = req.body;
      if (!subject || !html) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      queueEmailNotification({ subject, html, to });
      
      res.status(200).json({ success: true, message: "Email queued successfully" });
    } catch (error) {
      console.error("Error queueing email:", error);
      res.status(500).json({ error: "Failed to queue email" });
    }
  });

  // Real-time Push & Status Events Stream (SSE)
  app.get("/api/orders/events", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (res.flushHeaders) res.flushHeaders();

    // Initial greeting
    res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`);

    sseClients.push(res);

    req.on("close", () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // AI Assistant Dynamic Chat API with Model Fallback & Retry
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { messages, userMessage } = req.body;

      if (!userMessage && (!Array.isArray(messages) || messages.length === 0)) {
        return res.status(400).json({ error: "Missing message payload" });
      }

      const ai = getAIClient();

      // Build conversation turns for Gemini
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(messages) && messages.length > 0) {
        for (const msg of messages) {
          if (!msg.content || typeof msg.content !== 'string') continue;
          contents.push({
            role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content.trim() }],
          });
        }
      }

      if (userMessage && typeof userMessage === 'string' && userMessage.trim()) {
        contents.push({
          role: 'user',
          parts: [{ text: userMessage.trim() }],
        });
      }

      // Ensure content sequence starts with 'user' role if needed
      while (contents.length > 0 && contents[0].role !== 'user') {
        contents.shift();
      }

      if (contents.length === 0) {
        return res.status(400).json({ error: "No valid messages to send" });
      }

      let lastError: any = null;
      let reply: string | null = null;

      // Try models in cascade if a 503 or demand spike occurs
      for (const modelName of FALLBACK_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.7,
            },
          });

          const text = response.text?.trim();
          if (text) {
            reply = text;
            break; // Success!
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} encountered error:`, err?.message || err);
          lastError = err;
          // Continue to next model in list
        }
      }

      if (!reply) {
        throw lastError || new Error("All fallback models failed to respond.");
      }

      return res.json({
        reply,
        status: 'success',
      });
    } catch (error: any) {
      console.error("AI Assistant API error:", error);
      return res.status(500).json({
        error: "حدث خطأ أثناء التواصل مع نموذج الذكاء الاصطناعي.",
        message: error?.message || "Internal server error",
      });
    }
  });

  // ==========================================
  // In-App Orders & Live Tracking API
  // ==========================================

  // 1. Get all orders (for Admin Dashboard)
  app.get("/api/orders", (_req: Request, res: Response) => {
    try {
      // Sort newest first
      const sorted = [...ordersCache].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return res.json({ orders: sorted });
    } catch (error: any) {
      console.error("Failed to fetch orders:", error);
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // 2. Track order by unique code or ID
  app.get("/api/orders/track/:code", (req: Request, res: Response) => {
    try {
      const code = req.params.code?.trim().toUpperCase();
      if (!code) {
        return res.status(400).json({ error: "يرجى إدخال رمز تتبع صالح" });
      }

      // Match either exact trackingCode (case-insensitive) or ID
      const order = ordersCache.find(
        (o) =>
          o.trackingCode.toUpperCase() === code ||
          o.trackingCode.toUpperCase() === `ORD-${code.replace(/^#?ORD-?/i, '')}` ||
          o.id.toLowerCase() === code.toLowerCase()
      );

      if (!order) {
        return res.status(404).json({ error: "لم يتم العثور على طلب بهذا الرمز. يرجى التأكد من الرمز والمحاولة مجدداً." });
      }

      return res.json({ order });
    } catch (error: any) {
      console.error("Track order error:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء البحث عن الطلب" });
    }
  });

  // 3. Create new direct order (In-App Checkout)
  app.post("/api/orders", (req: Request, res: Response) => {
    try {
      const {
        items,
        customer,
        subtotal,
        deliveryFee,
        discountAmount,
        couponCode,
        total,
        deliveryTiming,
        customTimingText,
        location,
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "السلة فارغة، يرجى إضافة منتجات أولاً" });
      }

      if (!customer || !customer.name?.trim() || !customer.phone?.trim()) {
        return res.status(400).json({ error: "يرجى إكمال بيانات التوصيل (اسم المستلم ورقم الهاتف)" });
      }

      const mapUrlComputed = location?.mapUrl || (location?.latitude && location?.longitude ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : undefined);
      const computedAddress = customer.address?.trim() || (mapUrlComputed ? `موقع GPS المباشر: ${mapUrlComputed}` : "العراق - موقع GPS مباشر");

      // Generate unique random 4-digit code e.g. ORD-7392
      let uniqueCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      while (ordersCache.some((o) => o.trackingCode === uniqueCode)) {
        uniqueCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const newOrder: OrderRecord = {
        id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        trackingCode: uniqueCode,
        items,
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          governorate: customer.governorate || "العراق",
          address: computedAddress,
          notes: customer.notes?.trim() || "",
        },
        subtotal: Number(subtotal) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        discountAmount: Number(discountAmount) || 0,
        couponCode: couponCode || undefined,
        total: Number(total) || 0,
        deliveryTiming: deliveryTiming || "today",
        customTimingText: customTimingText?.trim() || "",
        location: location?.latitude && location?.longitude ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          mapUrl: location.mapUrl || `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
        } : undefined,
        status: "received",
        createdAt: new Date().toISOString(),
        statusUpdatedAt: new Date().toISOString(),
        driverNotes: "",
      };

      ordersCache.unshift(newOrder);
      saveOrdersToFile();

      // Real-time broadcast to all connected web clients & father's device
      broadcastSSEEvent("NEW_ORDER", newOrder);

      console.log(`[Order Created] Code: ${newOrder.trackingCode} | Customer: ${newOrder.customer.name} | Total: ${newOrder.total} IQD`);

      // Send instant Telegram notification to Father's Bot
      sendTelegramNotification(newOrder).then((result) => {
        if (result.success) {
          console.log(`[Telegram Notification] Successfully dispatched for order #${newOrder.trackingCode} to ${result.sentCount} chat(s)`);
        } else {
          console.warn(`[Telegram Notification] Could not dispatch for order #${newOrder.trackingCode}:`, result.errors);
        }
      }).catch((err) => {
        console.error('[Telegram Notification] Error during dispatch:', err);
      });

      return res.status(201).json({
        success: true,
        order: newOrder,
        message: "تم تثبيت طلبك بنجاح! رقم التتبع: " + newOrder.trackingCode,
      });
    } catch (error: any) {
      console.error("Create order error:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء تثبيت الطلب" });
    }
  });

  // 4. Update order status (Father's Admin action)
  app.patch("/api/orders/:id/status", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, driverNotes } = req.body;

      const validStatuses = ['received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "حالة الطلب غير صالحة" });
      }

      const orderIndex = ordersCache.findIndex((o) => o.id === id || o.trackingCode === id);
      if (orderIndex === -1) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      ordersCache[orderIndex].status = status;
      ordersCache[orderIndex].statusUpdatedAt = new Date().toISOString();
      if (typeof driverNotes === 'string') {
        ordersCache[orderIndex].driverNotes = driverNotes.trim();
      }

      saveOrdersToFile();

      const updatedOrder = ordersCache[orderIndex];
      broadcastSSEEvent("ORDER_STATUS_CHANGED", {
        orderId: updatedOrder.id,
        trackingCode: updatedOrder.trackingCode,
        status: updatedOrder.status,
        driverNotes: updatedOrder.driverNotes,
        statusUpdatedAt: updatedOrder.statusUpdatedAt,
        customerName: updatedOrder.customer.name,
        order: updatedOrder,
      });

      return res.json({
        success: true,
        order: updatedOrder,
      });
    } catch (error: any) {
      console.error("Update order status error:", error);
      return res.status(500).json({ error: "فشل تحديث حالة الطلب" });
    }
  });

  // 5. Delete order (Admin only)
  app.delete("/api/orders/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const initialLength = ordersCache.length;
      ordersCache = ordersCache.filter((o) => o.id !== id && o.trackingCode !== id);
      
      if (ordersCache.length === initialLength) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      saveOrdersToFile();
      return res.json({ success: true, message: "تم حذف الطلب بنجاح" });
    } catch (error: any) {
      console.error("Delete order error:", error);
      return res.status(500).json({ error: "فشل حذف الطلب" });
    }
  });

  // 6. Verify Admin PIN (Default PIN: 1234 or 2025)
  app.post("/api/admin/verify-pin", (req: Request, res: Response) => {
    const { pin } = req.body;
    if (pin === "1234" || pin === "2025" || pin === "queen" || pin === "الوالد") {
      return res.json({ valid: true });
    }
    return res.status(401).json({ valid: false, error: "رمز الدخول غير صحيح" });
  });

  // ==========================================
  // Private Live Chat API (Admin <-> Customer)
  // ==========================================

  // 1. Get list of all chat threads for Admin Dashboard
  app.get("/api/chats", (_req: Request, res: Response) => {
    try {
      // Collect unique order IDs from chats & orders
      const orderIds = new Set<string>();
      chatsCache.forEach((m) => orderIds.add(m.orderId.toUpperCase()));
      ordersCache.forEach((o) => orderIds.add(o.trackingCode.toUpperCase()));

      const threads = Array.from(orderIds).map((code) => {
        const order = ordersCache.find(
          (o) => o.trackingCode.toUpperCase() === code || o.id.toUpperCase() === code
        );
        const threadMessages = chatsCache
          .filter((m) => m.orderId.toUpperCase() === code)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const lastMessage = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;
        const unreadCount = threadMessages.filter((m) => m.sender === 'customer' && !m.readByAdmin).length;

        return {
          orderId: code,
          customerName: order?.customer.name || (lastMessage ? lastMessage.senderName : 'زبون المتجر'),
          customerPhone: order?.customer.phone || '',
          governorate: order?.customer.governorate || '',
          orderStatus: order?.status || 'received',
          orderTotal: order?.total || 0,
          lastMessage: lastMessage ? lastMessage.text : 'لا توجد رسائل سابقة',
          lastMessageTime: lastMessage ? lastMessage.createdAt : (order ? order.createdAt : new Date().toISOString()),
          unreadCount,
          messageCount: threadMessages.length,
        };
      });

      // Sort threads: ones with unread messages first, then newest message first
      threads.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      return res.json({ threads });
    } catch (error: any) {
      console.error("Fetch chats error:", error);
      return res.status(500).json({ error: "فشل تحميل قائمة المحادثات" });
    }
  });

  // 2. Get messages for a specific order & mark as read
  app.get("/api/chats/:orderId/messages", (req: Request, res: Response) => {
    try {
      const code = req.params.orderId?.trim().toUpperCase();
      const readBy = req.query.readBy as string;

      if (!code) {
        return res.status(400).json({ error: "رمز الطلب مفقود" });
      }

      // Mark as read if specified
      let updated = false;
      chatsCache.forEach((msg) => {
        if (msg.orderId.toUpperCase() === code) {
          if (readBy === 'admin' && !msg.readByAdmin) {
            msg.readByAdmin = true;
            updated = true;
          } else if (readBy === 'customer' && !msg.readByCustomer) {
            msg.readByCustomer = true;
            updated = true;
          }
        }
      });

      if (updated) {
        saveChatsToFile();
      }

      const messages = chatsCache
        .filter((m) => m.orderId.toUpperCase() === code)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const order = ordersCache.find(
        (o) => o.trackingCode.toUpperCase() === code || o.id.toUpperCase() === code
      );

      return res.json({
        orderId: code,
        order,
        messages,
      });
    } catch (error: any) {
      console.error("Fetch order messages error:", error);
      return res.status(500).json({ error: "فشل تحميل رسائل المحادثة" });
    }
  });

  // 3. Post a new message in order chat
  app.post("/api/chats/:orderId/messages", (req: Request, res: Response) => {
    try {
      const code = req.params.orderId?.trim().toUpperCase();
      const { sender, senderName, text } = req.body;

      if (!code) {
        return res.status(400).json({ error: "رمز الطلب غير صالح" });
      }

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: "لا يمكن إرسال رسالة فارغة" });
      }

      const order = ordersCache.find(
        (o) => o.trackingCode.toUpperCase() === code || o.id.toUpperCase() === code
      );

      const isSenderAdmin = sender === 'admin';
      const defaultName = isSenderAdmin
        ? 'إدارة كوزمتك الملكة 👑'
        : (order?.customer.name || 'الزبون');

      const newMsg: ChatMessageRecord = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: code,
        sender: isSenderAdmin ? 'admin' : 'customer',
        senderName: senderName?.trim() || defaultName,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        readByAdmin: isSenderAdmin,
        readByCustomer: !isSenderAdmin,
      };

      chatsCache.push(newMsg);
      saveChatsToFile();

      // Real-time broadcast
      broadcastSSEEvent("NEW_CHAT_MESSAGE", {
        orderId: code,
        message: newMsg,
        customerName: order?.customer.name || newMsg.senderName,
      });

      // Send background Telegram & Email notifications when customer sends a message
      if (!isSenderAdmin) {
        const custName = order?.customer?.name || newMsg.senderName || 'زبون المتجر';
        const custPhone = order?.customer?.phone || 'غير محدد';
        const custGovernorate = order?.customer?.governorate || 'غير محدد';

        // 1. Instant Telegram Bot notification
        sendChatMessageTelegramNotification({
          customerName: custName,
          orderId: code,
          text: newMsg.text,
        }).catch((err) => {
          console.error("Failed to send Telegram chat notification:", err);
        });

        // 2. Parallel email notification via queue
        try {
          const emailHtml = `
            <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #d4af37;">💬 رسالة محادثة جديدة من زبون</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right; background-color: #f9f9f9;">اسم الزبون</th>
                  <td style="padding: 10px; border: 1px solid #ddd;">${custName}</td>
                </tr>
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right; background-color: #f9f9f9;">رمز التتبع</th>
                  <td style="padding: 10px; border: 1px solid #ddd;">#${code}</td>
                </tr>
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right; background-color: #f9f9f9;">رقم الهاتف</th>
                  <td style="padding: 10px; border: 1px solid #ddd;">${custPhone}</td>
                </tr>
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right; background-color: #f9f9f9;">المحافظة</th>
                  <td style="padding: 10px; border: 1px solid #ddd;">${custGovernorate}</td>
                </tr>
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right; background-color: #f9f9f9;">نص الرسالة</th>
                  <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${newMsg.text}</td>
                </tr>
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: right; background-color: #f9f9f9;">تاريخ الرسالة</th>
                  <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" })}</td>
                </tr>
              </table>
            </div>
          `;
          
          queueEmailNotification({
            subject: `💬 رسالة جديدة - رمز التتبع: #${code}`,
            html: emailHtml,
          });
        } catch (err) {
          console.error("Failed to enqueue email notification:", err);
        }
      }

      return res.status(201).json({
        success: true,
        message: newMsg,
      });
    } catch (error: any) {
      console.error("Post chat message error:", error);
      return res.status(500).json({ error: "فشل إرسال الرسالة" });
    }
  });

  // ==========================================
  // Stock Availability Notification Requests API
  // ==========================================

  // 1. Submit "Notify me when available" request
  app.post("/api/stock-alerts", (req: Request, res: Response) => {
    try {
      const {
        productId,
        productName,
        productBrand,
        productPrice,
        productImage,
        customerPhone,
        customerName,
        notes,
      } = req.body;

      if (!productId || !customerPhone) {
        return res.status(400).json({ error: "يرجى تزويد معرف المنتج ورقم الهاتف" });
      }

      const cleanPhone = String(customerPhone).trim();
      if (cleanPhone.length < 9) {
        return res.status(400).json({ error: "يرجى إدخال رقم هاتف صحيح (مثال: 07801234567)" });
      }

      const newAlert: StockAlertRecord = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: String(productId).trim(),
        productName: String(productName || 'منتج كوزمتك الملكة').trim(),
        productBrand: String(productBrand || 'كوزمتك الملكة').trim(),
        productPrice: Number(productPrice) || 0,
        productImage: String(productImage || ''),
        customerPhone: cleanPhone,
        customerName: customerName ? String(customerName).trim() : undefined,
        notes: notes ? String(notes).trim() : undefined,
        createdAt: new Date().toISOString(),
        notified: false,
      };

      stockAlertsCache.unshift(newAlert);
      saveStockAlertsToFile();

      console.log(`[Stock Alert Request] Phone: ${newAlert.customerPhone} | Product: ${newAlert.productName}`);

      // Instantly notify Dad / Shop Owner via Telegram Bot
      sendStockAlertTelegramNotification(newAlert).then((resTelegram) => {
        if (resTelegram.success) {
          console.log(`[Telegram Stock Alert] Dispatched to ${resTelegram.sentCount} chat(s)`);
        } else {
          console.warn(`[Telegram Stock Alert] Failed or skipped:`, resTelegram.errors);
        }
      }).catch((err) => {
        console.error('[Telegram Stock Alert] Dispatch error:', err);
      });

      return res.status(201).json({
        success: true,
        message: "تم تسجيل طلبك بنجاح! سنقوم بإشعارك فور توفر المنتج 🔔",
        alert: newAlert,
      });
    } catch (error: any) {
      console.error("Stock alert submission error:", error);
      return res.status(500).json({ error: "فشل تسجيل طلب الإشعار" });
    }
  });

  // 2. Get all stock alerts (For Admin Panel)
  app.get("/api/stock-alerts", (_req: Request, res: Response) => {
    try {
      const sorted = [...stockAlertsCache].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return res.json({ alerts: sorted, totalCount: sorted.length });
    } catch (error: any) {
      console.error("Failed to fetch stock alerts:", error);
      return res.status(500).json({ error: "Failed to fetch stock alerts" });
    }
  });

  // 3. Mark stock alert as notified or delete
  app.patch("/api/stock-alerts/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notified } = req.body;
      const alertIndex = stockAlertsCache.findIndex((a) => a.id === id);

      if (alertIndex === -1) {
        return res.status(404).json({ error: "طلب الإشعار غير موجود" });
      }

      if (typeof notified === 'boolean') {
        stockAlertsCache[alertIndex].notified = notified;
      }
      saveStockAlertsToFile();

      return res.json({ success: true, alert: stockAlertsCache[alertIndex] });
    } catch (error: any) {
      return res.status(500).json({ error: "فشل تحديث حالة الإشعار" });
    }
  });

  // 4. Delete stock alert
  app.delete("/api/stock-alerts/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const prevLength = stockAlertsCache.length;
      stockAlertsCache = stockAlertsCache.filter((a) => a.id !== id);

      if (stockAlertsCache.length === prevLength) {
        return res.status(404).json({ error: "طلب الإشعار غير موجود" });
      }

      saveStockAlertsToFile();
      return res.json({ success: true, message: "تم حذف طلب الإشعار" });
    } catch (error: any) {
      return res.status(500).json({ error: "فشل حذف طلب الإشعار" });
    }
  });

  // ==========================================
  // Product Reviews & 5-Star Ratings API
  // ==========================================

  // 1. Get reviews (optionally filtered by productId, or all reviews)
  app.get("/api/reviews", (req: Request, res: Response) => {
    try {
      const productId = req.query.productId ? String(req.query.productId).trim() : null;

      let filtered = [...reviewsCache];
      if (productId) {
        filtered = filtered.filter((r) => r.productId === productId);
      }

      // Sort newest first by default
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({
        reviews: filtered,
        total: filtered.length,
      });
    } catch (error: any) {
      console.error("Fetch reviews error:", error);
      return res.status(500).json({ error: "فشل تحميل تقييمات المنتجات" });
    }
  });

  // 2. Submit a new genuine product review
  app.post("/api/reviews", (req: Request, res: Response) => {
    try {
      const {
        productId,
        authorName,
        governorate,
        rating,
        comment,
      } = req.body;

      if (!productId || !authorName || !comment) {
        return res.status(400).json({ error: "يرجى ملء جميع الحقول المطلوبة (اسمك، رأيك، والتقييم)" });
      }

      const numRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
      const cleanName = String(authorName).trim().slice(0, 80);
      const cleanComment = String(comment).trim().slice(0, 1000);
      const cleanGov = governorate ? String(governorate).trim().slice(0, 60) : 'العراق';

      if (!cleanComment) {
        return res.status(400).json({ error: "لا يمكن إرسال تعليق فارغ" });
      }

      const newReview: ProductReviewRecord = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: String(productId).trim(),
        authorName: cleanName,
        governorate: cleanGov,
        rating: numRating,
        comment: cleanComment,
        createdAt: new Date().toISOString(),
        verifiedPurchase: true,
        likes: 0,
      };

      reviewsCache.unshift(newReview);
      saveReviewsToFile();

      // Real-time broadcast to all connected visitors
      broadcastSSEEvent("NEW_PRODUCT_REVIEW", {
        productId: newReview.productId,
        review: newReview,
      });

      console.log(`[New Product Review] Product: ${newReview.productId} | Rating: ${newReview.rating}★ | Author: ${newReview.authorName}`);

      return res.status(201).json({
        success: true,
        message: "تم حفظ ونشر تقييمك بنجاح! أصبح مرئياً لجميع الزبائن الآن ⭐",
        review: newReview,
      });
    } catch (error: any) {
      console.error("Submit review error:", error);
      return res.status(500).json({ error: "فشل نشر التقييم" });
    }
  });

  // 3. Like / Helpful toggle on a review
  app.post("/api/reviews/:id/like", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'like' or 'unlike'
      const review = reviewsCache.find((r) => r.id === id);

      if (!review) {
        return res.status(404).json({ error: "التقييم غير موجود" });
      }

      if (action === 'unlike') {
        review.likes = Math.max(0, (review.likes || 1) - 1);
      } else {
        review.likes = (review.likes || 0) + 1;
      }

      saveReviewsToFile();

      broadcastSSEEvent("REVIEW_LIKED", {
        reviewId: id,
        likes: review.likes,
      });

      return res.json({ success: true, likes: review.likes });
    } catch (error: any) {
      return res.status(500).json({ error: "فشل تحديث الإعجاب بالتقييم" });
    }
  });

  // 4. Delete a review (Admin action)
  app.delete("/api/reviews/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const prevCount = reviewsCache.length;
      const target = reviewsCache.find((r) => r.id === id);
      reviewsCache = reviewsCache.filter((r) => r.id !== id);

      if (reviewsCache.length === prevCount) {
        return res.status(404).json({ error: "التقييم غير موجود" });
      }

      saveReviewsToFile();

      if (target) {
        broadcastSSEEvent("REVIEW_DELETED", {
          reviewId: id,
          productId: target.productId,
        });
      }

      return res.json({ success: true, message: "تم حذف التقييم" });
    } catch (error: any) {
      return res.status(500).json({ error: "فشل حذف التقييم" });
    }
  });

  // ==========================================
  // Telegram Bot Management & Notification API
  // ==========================================

  // Get Telegram Status & Config
  app.get("/api/telegram/status", async (_req: Request, res: Response) => {
    try {
      const config = getTelegramConfig();
      const botMe = await getBotMe(config.botToken);

      return res.json({
        ok: true,
        config: {
          botToken: config.botToken ? `${config.botToken.substring(0, 10)}...${config.botToken.slice(-5)}` : '',
          fullToken: config.botToken,
          tokenPreview: config.botToken ? `${config.botToken.substring(0, 12)}...${config.botToken.slice(-6)}` : '',
          chatIds: config.chatIds,
          enabled: config.enabled,
          lastSync: config.lastSync,
          botUsername: botMe.ok ? botMe.result?.username : config.botUsername || '',
        },
        botInfo: botMe,
        isConnected: botMe.ok,
      });
    } catch (err: any) {
      console.error("Telegram status error:", err);
      return res.status(500).json({ error: "Failed to get Telegram status" });
    }
  });

  // Sync / Fetch Telegram subscribers
  app.post("/api/telegram/sync", async (_req: Request, res: Response) => {
    try {
      const result = await syncTelegramChats();
      return res.json(result);
    } catch (err: any) {
      console.error("Telegram sync error:", err);
      return res.status(500).json({ ok: false, error: err?.message || "Sync failed" });
    }
  });

  // Send Test Message
  app.post("/api/telegram/test", async (req: Request, res: Response) => {
    try {
      const { chatId } = req.body;
      const result = await sendTestTelegramMessage(chatId);
      return res.json(result);
    } catch (err: any) {
      console.error("Telegram test message error:", err);
      return res.status(500).json({ success: false, message: err?.message || "Failed to send test message" });
    }
  });

  // Save / Update Telegram Config (Token, Chat IDs, Enabled)
  app.post("/api/telegram/config", (req: Request, res: Response) => {
    try {
      const { botToken, chatIds, enabled } = req.body;
      const currentConfig = getTelegramConfig();

      if (typeof botToken === "string" && botToken.trim()) {
        currentConfig.botToken = botToken.trim();
      }
      if (Array.isArray(chatIds)) {
        currentConfig.chatIds = chatIds.map((c) => String(c).trim()).filter(Boolean);
      }
      if (typeof enabled === "boolean") {
        currentConfig.enabled = enabled;
      }

      saveTelegramConfig(currentConfig);

      return res.json({
        success: true,
        message: "تم حفظ إعدادات بوت التلجرام بنجاح",
        config: currentConfig,
      });
    } catch (err: any) {
      console.error("Save telegram config error:", err);
      return res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Queen Cosmetics server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
