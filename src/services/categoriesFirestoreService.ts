import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/products';

const CATEGORIES_COLLECTION = 'categories';

/**
 * Real-time synchronization for categories collection.
 */
export function subscribeToCategoriesRealtime(
  onUpdate: (categories: Category[]) => void
): Unsubscribe {
  const colRef = collection(db, CATEGORIES_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        // If empty in cloud, we might want to seed it with defaults or just return empty
        onUpdate([]);
        return;
      }

      const cloudCategories: Category[] = [];
      snapshot.docs.forEach((d) => {
        cloudCategories.push({
          ...(d.data() as Category),
          id: d.id as any
        });
      });
      
      onUpdate(cloudCategories);
    },
    (err) => {
      console.warn('Firestore categories onSnapshot notice:', err);
    }
  );

  return unsubscribe;
}

/**
 * Save categories to Firestore
 */
export async function saveCategoriesToFirestore(categories: Category[]): Promise<void> {
  // To keep it simple and handle the whole list (since categories are usually few)
  // we can use a batch or just set each one.
  for (const cat of categories) {
    const docRef = doc(db, CATEGORIES_COLLECTION, cat.id);
    await setDoc(docRef, cat, { merge: true });
  }
}

/**
 * Add or update a single category
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, category.id);
  await setDoc(docRef, category, { merge: true });
}

/**
 * Delete a category from Firestore
 */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
  await deleteDoc(docRef);
}

/**
 * Fetch all categories once
 */
export async function fetchAllCategories(): Promise<Category[]> {
  try {
    const colRef = collection(db, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(d => ({
      ...(d.data() as Category),
      id: d.id as any
    }));
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [];
  }
}
