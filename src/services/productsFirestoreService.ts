import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  writeBatch, 
  getDocs,
  deleteDoc,
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

// Check and seed initial authentic products if database is empty
export async function seedProductsIfEmpty(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    if (querySnapshot.empty) {
      console.log(`[Firestore] Initializing and seeding ${PRODUCTS.length} authentic products...`);
      const batch = writeBatch(db);
      PRODUCTS.forEach((product) => {
        const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
        batch.set(docRef, {
          ...product,
          inStock: product.inStock ?? true,
          isOffer: product.isOffer ?? false,
          originalPrice: product.originalPrice ?? null,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      console.log(`[Firestore] Successfully seeded initial products.`);
    }
  } catch (error) {
    console.error('[Firestore] Error seeding initial products:', error);
  }
}

/**
 * Real-time synchronization subscription for products collection.
 * Delivers immediate live updates when any product is added, updated, or deleted.
 */
export function subscribeToProductsRealtime(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, PRODUCTS_COLLECTION);

  // Trigger seeding check asynchronously in background
  seedProductsIfEmpty();

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      // If collection is completely empty, provide default products while seeding
      if (snapshot.empty) {
        onUpdate(PRODUCTS);
        return;
      }

      const firestoreProductsMap = new Map<string, any>();
      const customProducts: Product[] = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        // Skip explicitly soft-deleted products
        if (data.isDeleted === true) {
          firestoreProductsMap.set(d.id, { isDeleted: true });
          return;
        }

        const productObj: any = { id: d.id, ...data };
        firestoreProductsMap.set(d.id, productObj);

        // Track custom or new products not part of original static list
        if (!PRODUCTS.some((p) => p.id === d.id)) {
          if (productObj.name && typeof productObj.price === 'number') {
            customProducts.push({
              ...productObj,
              id: d.id,
              inStock: productObj.inStock !== undefined ? Boolean(productObj.inStock) : true,
              isOffer: productObj.isOffer ?? false
            });
          }
        }
      });

      // Map over base products, filtering out any deleted ones and applying real-time cloud edits
      const mergedBaseProducts: Product[] = [];
      PRODUCTS.forEach((baseProduct) => {
        const cloudData = firestoreProductsMap.get(baseProduct.id);
        
        // If deleted in cloud, do NOT include in store
        if (cloudData && cloudData.isDeleted === true) {
          return;
        }

        if (!cloudData) {
          // Document not in cloud yet (or not loaded), keep base
          mergedBaseProducts.push(baseProduct);
          return;
        }

        const isGenericName = !cloudData.name || /^منتج \d+$/i.test(cloudData.name.trim());
        const finalName = isGenericName ? baseProduct.name : cloudData.name;
        const finalBrand = cloudData.brand || baseProduct.brand;
        const finalEnName = isGenericName ? baseProduct.enName : (cloudData.enName || baseProduct.enName);
        const finalDesc = isGenericName ? baseProduct.description : (cloudData.description || baseProduct.description);

        mergedBaseProducts.push({
          ...baseProduct,
          ...cloudData,
          name: finalName,
          brand: finalBrand,
          enName: finalEnName,
          description: finalDesc,
          image: cloudData.image ? cloudData.image : baseProduct.image,
          category: cloudData.category ?? baseProduct.category,
          subCategory: cloudData.subCategory ?? baseProduct.subCategory,
          price: typeof cloudData.price === 'number' && cloudData.price > 0 ? cloudData.price : baseProduct.price,
          originalPrice: typeof cloudData.originalPrice === 'number' && cloudData.originalPrice > 0 ? cloudData.originalPrice : baseProduct.originalPrice,
          isOffer: cloudData.isOffer !== undefined ? cloudData.isOffer : (baseProduct.isOffer ?? false),
          inStock: cloudData.inStock !== undefined ? Boolean(cloudData.inStock) : true,
          stockCount: cloudData.inStock === false ? 0 : undefined
        });
      });

      // Combine base products + custom added products
      const allActiveProducts = [...customProducts, ...mergedBaseProducts];

      // Update local storage caches for fast instant rendering on next page load
      try {
        localStorage.setItem('queen_cosmetics_products', JSON.stringify(allActiveProducts));
        localStorage.setItem('queen_cosmetics_products_clean_v1', JSON.stringify(allActiveProducts));
      } catch (e) {
        // LocalStorage may exceed quota if images are stored in base64
      }

      onUpdate(allActiveProducts);
    },
    (err) => {
      console.error('Firestore products onSnapshot error:', err);
      if (onError) onError(err);
      onUpdate(PRODUCTS);
    }
  );

  return unsubscribe;
}

/**
 * Add a brand new product to Firestore permanently
 */
export async function addNewProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  const cleanPayload = {
    ...product,
    isDeleted: false,
    originalPrice: product.originalPrice ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

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
  const cleanUpdates: Record<string, any> = {
    ...updates,
    isDeleted: false,
    updatedAt: new Date().toISOString()
  };
  
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
 * Toggle InStock status
 */
export async function toggleProductStockInFirestore(
  productId: string,
  inStock: boolean
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  try {
    await setDoc(docRef, {
      inStock,
      stockCount: inStock ? null : 0,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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
    // 1. Mark as isDeleted in cloud so it never resurrects from static fallback
    await setDoc(docRef, {
      isDeleted: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. If it is a custom created product, also delete document
    if (!PRODUCTS.some((p) => p.id === productId)) {
      await deleteDoc(docRef);
    }
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

/**
 * Reset store products to default authentic catalog
 */
export async function resetStoreProductsToDefault(): Promise<void> {
  const batch = writeBatch(db);
  PRODUCTS.forEach((product) => {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    batch.set(docRef, {
      ...product,
      inStock: true,
      isOffer: product.isOffer ?? false,
      originalPrice: product.originalPrice ?? null,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });
  try {
    await batch.commit();
    console.log(`[Firestore] Reset all products to default successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COLLECTION);
  }
}
