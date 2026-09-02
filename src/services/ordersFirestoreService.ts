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
              if (o && (o.id || o.trackingCode)) {
                map.set(o.id || o.trackingCode, o);
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
    const serialized = JSON.stringify(orders);
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
 * 1. LocalStorage (queen_orders & active_order)
 * 2. Firestore Cloud Database (orders collection)
 * 3. Local Broadcast Channel & Window Events
 */
export async function saveOrderPermanently(order: Order): Promise<Order> {
  // 1. Immediately save to LocalStorage for zero-latency client persistence
  try {
    const currentOrders = getLocalOrders();
    const updatedOrders = [order, ...currentOrders.filter((o) => o.id !== order.id && o.trackingCode !== order.trackingCode)];
    saveLocalOrders(updatedOrders);

    localStorage.setItem(LOCAL_STORAGE_ACTIVE_ORDER_KEY, JSON.stringify(order));
    localStorage.setItem(LOCAL_STORAGE_LAST_CODE_KEY, order.trackingCode);
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 2. Broadcast immediately to any open admin dashboards or tabs
  try {
    broadcastNewOrderLocally(order as any);
    window.dispatchEvent(new CustomEvent('queen_new_order', { detail: order }));
    window.dispatchEvent(new Event('queen_orders_updated'));
  } catch (err) {
    console.warn('Broadcast dispatch error:', err);
  }

  // 3. Save to Firebase Firestore cloud database
  try {
    const docRef = doc(db, ORDERS_COLLECTION, order.id);
    await setDoc(docRef, {
      ...order,
      savedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore] Order ${order.trackingCode} saved to cloud database successfully.`);
  } catch (firestoreErr) {
    console.warn('[Firestore] Could not save order to cloud (offline fallback active):', firestoreErr);
  }

  return order;
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
      const data = d.data() as Order;
      if (data && data.trackingCode) {
        const fullOrder = { ...data, id: d.id };
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
          if (o && (o.id || o.trackingCode)) {
            map.set(o.id || o.trackingCode, o);
          }
        });
      }
    }
  } catch (serverErr) {
    // Silent
  }

  const allMerged = Array.from(map.values());
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
        if (o && (o.id || o.trackingCode)) {
          map.set(o.id || o.trackingCode, o);
        }
      });

      snapshot.docs.forEach((d) => {
        const data = d.data() as Order;
        if (data && data.trackingCode) {
          const fullOrder = { ...data, id: d.id };
          map.set(fullOrder.id || fullOrder.trackingCode, fullOrder);
        }
      });

      const mergedOrders = Array.from(map.values());
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
