import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, OrderStatus } from '../types';
import { broadcastNewOrderLocally } from '../utils/alerts';

const ORDERS_COLLECTION = 'orders';
const LOCAL_STORAGE_ORDERS_KEY = 'queen_orders';
const LOCAL_STORAGE_ACTIVE_ORDER_KEY = 'active_order';
const LOCAL_STORAGE_LAST_CODE_KEY = 'queen_last_order_code';

const ORDERS_KEYS = ['queen_orders', 'orders', 'cosmetic_local_orders'];

/**
 * Normalizes any raw order object (from local storage, Firestore, or direct checkout)
 * into a bulletproof Order model that satisfies both nested and flat schemas,
 * and handles status 'جديد' / 'received' seamlessly.
 */
export function normalizeOrder(raw: any): Order {
  if (!raw || typeof raw !== 'object') {
    const fallbackId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fallbackCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();
    return {
      id: fallbackId,
      trackingCode: fallbackCode,
      items: [],
      customer: {
        name: 'زبون المتجر',
        phone: '',
        address: 'العراق',
        governorate: 'العراق',
      },
      customerName: 'زبون المتجر',
      phone: '',
      address: 'العراق',
      totalPrice: 0,
      date: nowIso,
      subtotal: 0,
      deliveryFee: 0,
      discountAmount: 0,
      total: 0,
      deliveryTiming: 'today',
      status: 'received',
      createdAt: nowIso,
      statusUpdatedAt: nowIso,
    } as any;
  }

  const id = String(raw.id || raw.trackingCode || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
  const rawCode = String(raw.trackingCode || raw.id || '');
  const trackingCode = rawCode.startsWith('ORD-')
    ? rawCode
    : `ORD-${rawCode.replace(/^#?ORD-?/i, '') || Math.floor(1000 + Math.random() * 9000)}`;

  // Extract customer information
  const custObj = typeof raw.customer === 'object' && raw.customer !== null ? raw.customer : {};
  const customerName = String(custObj.name || raw.customerName || raw.name || 'زبون المتجر').trim();
  const customerPhone = String(custObj.phone || raw.phone || '').trim();
  const customerGov = String(custObj.governorate || raw.governorate || 'العراق').trim();
  const customerDistrict = custObj.district || raw.district || '';
  const customerNearest = custObj.nearestLandmark || raw.nearestLandmark || '';
  const customerHouse = custObj.houseDetails || raw.houseDetails || '';
  const customerAddress = String(custObj.address || raw.address || customerGov || 'العراق').trim();
  const customerNotes = String(custObj.notes || raw.notes || '').trim();

  // Normalize items array safely
  let items: any[] = [];
  if (Array.isArray(raw.items)) {
    items = raw.items.map((it: any, idx: number) => {
      if (it && typeof it === 'object' && it.product) {
        return {
          product: {
            id: it.product.id || `p-${idx}`,
            name: it.product.name || 'منتج كوزمتك',
            price: Number(it.product.price) || 0,
            originalPrice: it.product.originalPrice ? Number(it.product.originalPrice) : undefined,
            image: it.product.image || '',
            brand: it.product.brand || 'كوزمتك الملكة',
            category: it.product.category || 'العناية',
          },
          quantity: Math.max(1, Number(it.quantity) || 1),
        };
      } else if (it && typeof it === 'object') {
        return {
          product: {
            id: it.id || `p-${idx}`,
            name: it.name || it.title || 'منتج كوزمتك',
            price: Number(it.price) || 0,
            originalPrice: it.originalPrice ? Number(it.originalPrice) : undefined,
            image: it.image || '',
            brand: it.brand || 'كوزمتك الملكة',
            category: it.category || 'العناية',
          },
          quantity: Math.max(1, Number(it.quantity) || 1),
        };
      }
      return {
        product: {
          id: `p-${idx}`,
          name: String(it || 'منتج كوزمتك'),
          price: 0,
          image: '',
          brand: 'كوزمتك الملكة',
        },
        quantity: 1,
      };
    });
  } else if (typeof raw.items === 'string' && raw.items.trim()) {
    items = [
      {
        product: {
          id: `p-${id}`,
          name: raw.items.trim(),
          price: Number(raw.totalPrice || raw.total) || 0,
          image: '',
          brand: 'كوزمتك الملكة',
        },
        quantity: 1,
      },
    ];
  }

  // Extract and calculate total numbers safely
  let totalNum = 0;
  if (typeof raw.total === 'number') totalNum = raw.total;
  else if (typeof raw.totalPrice === 'number') totalNum = raw.totalPrice;
  else if (typeof raw.total === 'string') {
    totalNum = parseInt(raw.total.replace(/[^\d]/g, ''), 10) || 0;
  } else if (typeof raw.totalPrice === 'string') {
    totalNum = parseInt(raw.totalPrice.replace(/[^\d]/g, ''), 10) || 0;
  }

  const subtotal = Number(raw.subtotal) || totalNum;
  const deliveryFee = raw.deliveryFee !== undefined ? Number(raw.deliveryFee) : 0;
  const discountAmount = Number(raw.discountAmount) || 0;

  // Status mapping: convert 'جديد' or 'new' to standard 'received' while keeping compatibility
  let status: OrderStatus = 'received';
  if (raw.status === 'preparing' || raw.status === 'out_for_delivery' || raw.status === 'delivered' || raw.status === 'cancelled') {
    status = raw.status;
  } else {
    // If 'جديد', 'new', 'received', or undefined, default to 'received'
    status = 'received';
  }

  const createdAt = raw.createdAt || raw.date || new Date().toISOString();
  const statusUpdatedAt = raw.statusUpdatedAt || createdAt;

  return {
    ...raw,
    id,
    trackingCode,
    customerName,
    phone: customerPhone,
    address: customerAddress,
    totalPrice: totalNum,
    date: createdAt,
    customer: {
      name: customerName,
      phone: customerPhone,
      governorate: customerGov,
      district: customerDistrict,
      nearestLandmark: customerNearest,
      houseDetails: customerHouse,
      address: customerAddress,
      notes: customerNotes,
    },
    items,
    subtotal,
    deliveryFee,
    discountAmount,
    total: totalNum,
    deliveryTiming: raw.deliveryTiming || 'today',
    customTimingText: raw.customTimingText || '',
    location: raw.location || undefined,
    status,
    createdAt,
    statusUpdatedAt,
    driverNotes: raw.driverNotes || '',
  } as Order;
}

/**
 * Reads locally cached orders safely from LocalStorage across multiple keys
 */
export function getLocalOrders(): Order[] {
  try {
    const map = new Map<string, Order>();
    ORDERS_KEYS.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((o: any) => {
              if (o && (o.id || o.trackingCode || o.customerName || o.name || o.phone)) {
                const normalized = normalizeOrder(o);
                map.set(normalized.id || normalized.trackingCode, normalized);
              }
            });
          }
        }
      } catch {}
    });
    const all = Array.from(map.values());
    all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return all;
  } catch (e) {
    console.warn('Error reading local orders:', e);
    return [];
  }
}

/**
 * Saves orders array safely to LocalStorage across all unified keys
 */
export function saveLocalOrders(orders: Order[]): void {
  try {
    const safeArray = Array.isArray(orders) ? orders.map(normalizeOrder) : [];
    const serialized = JSON.stringify(safeArray);
    ORDERS_KEYS.forEach((key) => {
      try {
        localStorage.setItem(key, serialized);
      } catch {}
    });
  } catch (e) {
    console.warn('Error saving local orders:', e);
  }
}

/**
 * Saves a single order permanently across:
 * 1. LocalStorage (queen_orders, orders, cosmetic_local_orders, & active_order)
 * 2. Firestore Cloud Database (orders collection)
 * 3. Local Broadcast Channel & Window Events
 */
export async function saveOrderPermanently(order: Order): Promise<Order> {
  const safeOrder = normalizeOrder(order);

  // 1. Immediately save to LocalStorage across all unified keys for zero-latency client persistence
  try {
    const currentOrders = getLocalOrders();
    const updatedOrders = [
      safeOrder,
      ...currentOrders.filter((o) => o.id !== safeOrder.id && o.trackingCode !== safeOrder.trackingCode),
    ];
    saveLocalOrders(updatedOrders);

    localStorage.setItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY, JSON.stringify(safeOrder));
    localStorage.setItem(LOCAL_STORAGE_LAST_CODE_KEY, safeOrder.trackingCode);
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 2. Broadcast immediately to any open admin dashboards or tabs
  try {
    broadcastNewOrderLocally(safeOrder as any);
    window.dispatchEvent(new CustomEvent('queen_new_order', { detail: safeOrder }));
    window.dispatchEvent(new CustomEvent('queen_new_order_event', { detail: safeOrder }));
    window.dispatchEvent(new Event('queen_orders_updated'));
  } catch (err) {
    console.warn('Broadcast dispatch error:', err);
  }

  // 3. Save to Firebase Firestore cloud database
  try {
    const docRef = doc(db, ORDERS_COLLECTION, safeOrder.id);
    await setDoc(docRef, {
      ...safeOrder,
      savedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`[Firestore] Order ${safeOrder.trackingCode} saved to cloud database successfully.`);
  } catch (firestoreErr) {
    console.warn('[Firestore] Could not save order to cloud (offline fallback active):', firestoreErr);
  }

  return safeOrder;
}

/**
 * Searches for an order by tracking code or ID across:
 * 1. Express backend API (if running)
 * 2. Firestore Cloud Database
 * 3. LocalStorage cache
 */
export async function findOrderByCode(codeToFind: string): Promise<Order | null> {
  const cleanCode = codeToFind.trim().toUpperCase();
  if (!cleanCode) return null;

  // 1. Try Backend API safely
  try {
    const res = await fetch(`/api/orders/track/${encodeURIComponent(cleanCode)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data && data.order) {
        // Cache to localStorage
        try {
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY, JSON.stringify(data.order));
          localStorage.setItem(LOCAL_STORAGE_LAST_CODE_KEY, data.order.trackingCode);
        } catch {}
        return data.order;
      }
    }
  } catch (serverErr) {
    // Backend unavailable or static deployment - silently proceed to Firestore/local
  }

  // 2. Search Firebase Firestore
  try {
    // Search by trackingCode
    const q = query(collection(db, ORDERS_COLLECTION), where('trackingCode', '==', cleanCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const foundOrder = snapshot.docs[0].data() as Order;
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY, JSON.stringify(foundOrder));
        localStorage.setItem(LOCAL_STORAGE_LAST_CODE_KEY, foundOrder.trackingCode);
      } catch {}
      return foundOrder;
    }

    // Try without prefix or by id
    const altCode = cleanCode.replace(/^#?ORD-?/i, '');
    const qAlt = query(collection(db, ORDERS_COLLECTION), where('trackingCode', '==', `ORD-${altCode}`));
    const snapshotAlt = await getDocs(qAlt);
    if (!snapshotAlt.empty) {
      const foundOrder = snapshotAlt.docs[0].data() as Order;
      return foundOrder;
    }
  } catch (firestoreErr) {
    console.warn('Firestore order search notice:', firestoreErr);
  }

  // 3. Fallback to LocalStorage
  try {
    // Check active_order
    const activeOrderRaw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY);
    if (activeOrderRaw) {
      const parsed = JSON.parse(activeOrderRaw) as Order;
      if (
        parsed.trackingCode?.toUpperCase() === cleanCode ||
        parsed.id?.toUpperCase() === cleanCode ||
        parsed.trackingCode?.toUpperCase() === `ORD-${cleanCode.replace(/^#?ORD-?/i, '')}`
      ) {
        return parsed;
      }
    }

    // Check queen_orders list
    const localOrders = getLocalOrders();
    const foundInLocal = localOrders.find(
      (o) =>
        o.trackingCode?.toUpperCase() === cleanCode ||
        o.id?.toUpperCase() === cleanCode ||
        o.trackingCode?.toUpperCase() === `ORD-${cleanCode.replace(/^#?ORD-?/i, '')}`
    );
    if (foundInLocal) return foundInLocal;
  } catch (localErr) {
    console.warn('LocalStorage order search notice:', localErr);
  }

  return null;
}

/**
 * Fetches all orders merging Backend API, Firestore, and LocalStorage
 */
export async function fetchAllOrdersCombined(): Promise<Order[]> {
  const map = new Map<string, Order>();

  // 1. Load local orders first
  const localOrders = getLocalOrders();
  localOrders.forEach((o) => {
    if (o && (o.id || o.trackingCode)) {
      map.set(o.id || o.trackingCode, o);
    }
  });

  // 2. Try Firestore
  try {
    const querySnapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    querySnapshot.forEach((d) => {
      const data = d.data();
      if (data) {
        const fullOrder = normalizeOrder({ ...data, id: d.id || data.id });
        map.set(fullOrder.id || fullOrder.trackingCode, fullOrder);
      }
    });
  } catch (firestoreErr) {
    console.warn('Firestore orders fetch notice:', firestoreErr);
  }

  // 3. Try Backend API as supplementary source
  try {
    const res = await fetch('/api/orders');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.orders)) {
        data.orders.forEach((o: any) => {
          if (o) {
            const fullOrder = normalizeOrder(o);
            map.set(fullOrder.id || fullOrder.trackingCode, fullOrder);
          }
        });
      }
    }
  } catch (serverErr) {
    // Silent
  }

  const allMerged = Array.from(map.values()).map(normalizeOrder);
  allMerged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  saveLocalOrders(allMerged);
  return allMerged;
}

/**
 * Real-time subscription to orders from Firestore, synced with LocalStorage
 */
export function subscribeToOrdersRealtime(onUpdate: (orders: Order[]) => void): Unsubscribe {
  const colRef = collection(db, ORDERS_COLLECTION);

  // Send local orders immediately for instant startup
  const localOrders = getLocalOrders();
  if (localOrders.length > 0) {
    onUpdate(localOrders);
  }

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const map = new Map<string, Order>();

      // Keep existing local orders as base
      const currentLocals = getLocalOrders();
      currentLocals.forEach((o) => {
        if (o) {
          const norm = normalizeOrder(o);
          map.set(norm.id || norm.trackingCode, norm);
        }
      });

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data) {
          const fullOrder = normalizeOrder({ ...data, id: d.id || data.id });
          map.set(fullOrder.id || fullOrder.trackingCode, fullOrder);
        }
      });

      const mergedOrders = Array.from(map.values()).map(normalizeOrder);
      mergedOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      // Save latest truth to LocalStorage
      saveLocalOrders(mergedOrders);
      onUpdate(mergedOrders);
    },
    (err) => {
      console.warn('Firestore orders onSnapshot notice (offline mode active):', err);
      onUpdate(getLocalOrders());
    }
  );

  return unsubscribe;
}

/**
 * Updates order status permanently across Firestore, Backend API, and LocalStorage
 */
export async function updateOrderStatusEverywhere(
  orderId: string,
  newStatus: OrderStatus,
  driverNotes?: string
): Promise<void> {
  const statusUpdatedAt = new Date().toISOString();

  // 1. Update in LocalStorage
  const localOrders = getLocalOrders();
  const updatedLocal = localOrders.map((o) => {
    if (o.id === orderId || o.trackingCode === orderId) {
      return {
        ...o,
        status: newStatus,
        statusUpdatedAt,
        driverNotes: driverNotes !== undefined ? driverNotes : o.driverNotes
      };
    }
    return o;
  });
  saveLocalOrders(updatedLocal);

  // Check active_order
  try {
    const activeRaw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY);
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active.id === orderId || active.trackingCode === orderId) {
        active.status = newStatus;
        active.statusUpdatedAt = statusUpdatedAt;
        if (driverNotes !== undefined) active.driverNotes = driverNotes;
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY, JSON.stringify(active));
      }
    }
  } catch {}

  // 2. Dispatch events locally
  window.dispatchEvent(new CustomEvent('queen_order_status_updated', {
    detail: { orderId, status: newStatus, driverNotes, statusUpdatedAt }
  }));
  window.dispatchEvent(new Event('queen_orders_updated'));

  // 3. Update in Firestore
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(docRef, {
      status: newStatus,
      statusUpdatedAt,
      ...(driverNotes !== undefined ? { driverNotes } : {})
    }, { merge: true });
  } catch (firestoreErr) {
    console.warn('Firestore status update notice:', firestoreErr);
  }

  // 4. Update in Backend API if accessible
  try {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, driverNotes })
    });
  } catch {}
}

/**
 * Deletes an order permanently from Firestore and LocalStorage
 */
export async function deleteOrderEverywhere(orderId: string): Promise<void> {
  // 1. Remove from LocalStorage
  const localOrders = getLocalOrders();
  const filtered = localOrders.filter((o) => o.id !== orderId && o.trackingCode !== orderId);
  saveLocalOrders(filtered);

  try {
    const activeRaw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY);
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active.id === orderId || active.trackingCode === orderId) {
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY);
      }
    }
  } catch {}

  window.dispatchEvent(new CustomEvent('queen_order_deleted', { detail: { orderId } }));
  window.dispatchEvent(new Event('queen_orders_updated'));

  // Broadcast deletion to other tabs
  try {
    const channel = new BroadcastChannel('queen_orders_channel');
    channel.postMessage({ type: 'ORDER_DELETED', payload: { orderId }, timestamp: Date.now() });
    channel.close();
  } catch {}

  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete order notice:', err);
  }

  // 3. Remove from Backend API if accessible
  try {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
  } catch {}
}
