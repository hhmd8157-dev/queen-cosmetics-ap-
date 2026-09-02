import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  writeBatch, 
  deleteDoc,
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { PRODUCTS } from '../data/products';

const PRODUCTS_COLLECTION = 'products';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Real-time synchronization subscription for products collection.
 */
export function subscribeToProductsRealtime(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, PRODUCTS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const activeProducts: Product[] = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.isDeleted === true) return;

        if (data.name && typeof data.price === 'number') {
          activeProducts.push({
            id: d.id,
            name: data.name,
            price: data.price,
            originalPrice: typeof data.originalPrice === 'number' && data.originalPrice > 0 ? data.originalPrice : undefined,
            image: data.image || '',
            category: data.category || 'عناية',
            subCategory: data.subCategory,
            description: data.description,
            rating: typeof data.rating === 'number' ? data.rating : 5,
            reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
            inStock: data.inStock !== undefined ? Boolean(data.inStock) : true,
            isOffer: data.isOffer ?? Boolean(data.originalPrice && data.originalPrice > data.price),
            isBestSeller: data.isBestSeller ?? false,
            isFeatured: data.isFeatured ?? false,
            isNew: data.isNew ?? false,
            brand: data.brand,
            enName: data.enName,
            volumeOrWeight: data.volumeOrWeight,
            madeIn: data.madeIn,
            benefits: data.benefits,
            howToUse: data.howToUse,
            tags: data.tags,
          });
        }
      });

      onUpdate(activeProducts.filter(p => p.image && p.image.trim() !== ''));
    },
    (err) => {
      console.warn('Firestore products onSnapshot notice:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Helper to recursively sanitize object for Firestore (removes undefined values and replaces them with null)
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          sanitized[key] = sanitizeForFirestore(val);
        }
      }
    }
    return sanitized;
  }
  return obj;
}

/**
 * Add a brand new product to Firestore permanently
 */
export async function addNewProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  const cleanPayload = sanitizeForFirestore({
    ...product,
    isDeleted: false,
    originalPrice: product.originalPrice ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  try {
    await setDoc(docRef, cleanPayload, { merge: true });
    console.log(`[Firestore] New product ${product.id} added successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
}

/**
 * Update an existing product in Firestore
 */
export async function updateProductInFirestore(
  productId: string, 
  updates: Partial<Product>
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  const cleanUpdates = sanitizeForFirestore({
    ...updates,
    isDeleted: false,
    updatedAt: new Date().toISOString()
  });
  
  if (updates.originalPrice === undefined) {
    cleanUpdates.originalPrice = null;
  }

  try {
    await setDoc(docRef, cleanUpdates, { merge: true });
    console.log(`[Firestore] Product ${productId} updated successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Delete a product permanently from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  
  try {
    await deleteDoc(docRef);
    console.log(`[Firestore] Product ${productId} deleted successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Sync all products into Firestore (Force push / backup)
 */
export async function forceSyncAllToFirestore(products: Product[]): Promise<void> {
  const chunkSize = 200;
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const docRef = doc(db, PRODUCTS_COLLECTION, p.id);
      const cleanData = sanitizeForFirestore({
        ...p,
        inStock: p.inStock ?? true,
        originalPrice: p.originalPrice || null,
        isDeleted: false,
        updatedAt: new Date().toISOString()
      });
      batch.set(docRef, cleanData, { merge: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COLLECTION);
    }
  }
}

/**
 * Toggle InStock status
 */
export async function toggleProductStockInFirestore(
  productId: string,
  inStock: boolean
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    const cleanUpdates = sanitizeForFirestore({
      inStock,
      stockCount: inStock ? null : 0,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleanUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Update product pricing and sale offer
 */
export async function updateProductPricingInFirestore(
  productId: string,
  price: number,
  originalPrice?: number
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  const isOffer = typeof originalPrice === 'number' && originalPrice > price;
  
  try {
    await setDoc(docRef, {
      price,
      originalPrice: typeof originalPrice === 'number' && originalPrice > 0 ? originalPrice : null,
      isOffer,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Permanently delete ALL products from Firestore.
 */
export async function deleteAllProductsFromFirestore(): Promise<void> {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Reset store products to default initial 103 products
 */
export async function resetStoreProductsToDefault(): Promise<void> {
  await deleteAllProductsFromFirestore();
  const chunkSize = 200;
  for (let i = 0; i < PRODUCTS.length; i += chunkSize) {
    const chunk = PRODUCTS.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      const docRef = doc(db, PRODUCTS_COLLECTION, p.id);
      batch.set(docRef, {
        ...p,
        inStock: p.inStock ?? true,
        originalPrice: p.originalPrice || null,
        isDeleted: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COLLECTION);
    }
  }
}
