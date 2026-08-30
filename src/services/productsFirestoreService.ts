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

// Check and seed/update initial products
export async function seedProductsIfEmpty(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    if (querySnapshot.empty) {
      console.log(`Syncing ${PRODUCTS.length} authentic catalog products into Firestore...`);
      const batch = writeBatch(db);
      PRODUCTS.forEach((product) => {
        const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
        batch.set(docRef, {
          ...product,
          inStock: true,
          isOffer: product.isOffer ?? false,
          originalPrice: product.originalPrice ?? null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      console.log(`Successfully synced products to Firestore.`);
    }
  } catch (error) {
    console.error('Error seeding products to Firestore:', error);
  }
}

// Real-time synchronization subscription
export function subscribeToProductsRealtime(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, PRODUCTS_COLLECTION);

  // Trigger seeding in background
  seedProductsIfEmpty();

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(PRODUCTS);
        return;
      }

      const firestoreProductsMap = new Map<string, any>();
      snapshot.docs.forEach((d) => {
        firestoreProductsMap.set(d.id, { id: d.id, ...d.data() });
      });

      // Merge with default list to maintain exact order and complete metadata
      const mergedProducts: Product[] = PRODUCTS.map((baseProduct) => {
        const cloudData = firestoreProductsMap.get(baseProduct.id);
        if (!cloudData) return baseProduct;

        const isGenericName = !cloudData.name || /^منتج \d+$/i.test(cloudData.name.trim()) || /^\d+\s*الاف?/i.test(cloudData.name.trim()) || /^\d+\s*الف/i.test(cloudData.name.trim());
        const finalName = isGenericName ? baseProduct.name : cloudData.name;
        const finalBrand = cloudData.brand || baseProduct.brand;
        const finalEnName = isGenericName ? baseProduct.enName : (cloudData.enName || baseProduct.enName);
        const finalDesc = isGenericName ? baseProduct.description : (cloudData.description || baseProduct.description);

        return {
          ...baseProduct,
          ...cloudData,
          name: finalName,
          brand: finalBrand,
          enName: finalEnName,
          description: finalDesc,
          image: (cloudData.image && (cloudData.image.startsWith('data:') || cloudData.image.startsWith('http://') || cloudData.image.startsWith('https://')))
            ? cloudData.image
            : baseProduct.image,
          imageName: baseProduct.image,
          category: cloudData.category ?? baseProduct.category,
          subCategory: cloudData.subCategory ?? baseProduct.subCategory,
          price: typeof cloudData.price === 'number' && cloudData.price > 0 && !isGenericName ? cloudData.price : baseProduct.price,
          originalPrice: typeof cloudData.originalPrice === 'number' && cloudData.originalPrice > 0 ? cloudData.originalPrice : baseProduct.originalPrice,
          isOffer: cloudData.isOffer !== undefined ? cloudData.isOffer : (baseProduct.isOffer ?? false),
          inStock: cloudData.inStock !== undefined ? Boolean(cloudData.inStock) : true,
          stockCount: cloudData.inStock === false ? 0 : undefined
        };
      });

      // Also append any newly created custom products from admin panel
      snapshot.docs.forEach((d) => {
        const id = d.id;
        // Ignore obsolete generated phantom items and base items
        if (!PRODUCTS.some((p) => p.id === id) && (id.startsWith('custom-') || id.startsWith('mix-'))) {
          const customData = d.data() as Product;
          if (customData.name && customData.price) {
            mergedProducts.push({
              ...customData,
              id: d.id,
              inStock: customData.inStock !== undefined ? Boolean(customData.inStock) : true
            });
          }
        }
      });

      try {
        localStorage.setItem('queen_cosmetics_products_clean_v1', JSON.stringify(mergedProducts));
      } catch (e) {
        // Ignore storage errors
      }

      onUpdate(mergedProducts);
    },
    (err) => {
      console.error('Firestore products onSnapshot error:', err);
      if (onError) onError(err);
      onUpdate(PRODUCTS);
    }
  );

  return unsubscribe;
}

// Update single product in Firestore
export async function updateProductInFirestore(
  productId: string, 
  updates: Partial<Product>
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  const cleanUpdates: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  if (updates.originalPrice === undefined) {
    cleanUpdates.originalPrice = null;
  }

  await setDoc(docRef, cleanUpdates, { merge: true });
}

// Update Product Prices (Original and Sale price)
export async function updateProductPricingInFirestore(
  productId: string,
  price: number,
  originalPrice?: number
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  const isOffer = typeof originalPrice === 'number' && originalPrice > price;
  
  await setDoc(docRef, {
    price,
    originalPrice: typeof originalPrice === 'number' && originalPrice > 0 ? originalPrice : null,
    isOffer,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// Toggle InStock status
export async function toggleProductStockInFirestore(
  productId: string,
  inStock: boolean
): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await setDoc(docRef, {
    inStock,
    stockCount: inStock ? null : 0,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// Sync all local products into Firestore (Force push)
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
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
  }
}

// Delete product from Firestore
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(docRef);
}
