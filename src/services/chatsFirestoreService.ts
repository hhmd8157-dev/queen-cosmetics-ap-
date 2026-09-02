import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const CHATS_COLLECTION = 'chats';

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  readByAdmin: boolean;
  readByCustomer: boolean;
  trackingCode?: string;
}

/**
 * Real-time synchronization for a specific chat thread (by orderId/trackingCode)
 */
export function subscribeToChatRealtime(
  orderId: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe {
  const colRef = collection(db, CHATS_COLLECTION, orderId.toUpperCase(), 'messages');
  const q = query(colRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.docs.forEach((d) => {
        messages.push({
          ...(d.data() as ChatMessage),
          id: d.id
        });
      });
      onUpdate(messages);
    },
    (err) => {
      console.warn(`Firestore chat onSnapshot notice for ${orderId}:`, err);
    }
  );

  return unsubscribe;
}

/**
 * Save a single chat message to Firestore
 */
export async function sendChatMessageToFirestore(msg: ChatMessage & { customerPhone?: string; governorate?: string }): Promise<void> {
  const threadId = msg.orderId.toUpperCase();
  const docId = msg.id || `msg-${Date.now()}`;
  const docRef = doc(db, CHATS_COLLECTION, threadId, 'messages', docId);
  
  await setDoc(docRef, {
    ...msg,
    id: docId,
    orderId: threadId,
    createdAt: msg.createdAt || new Date().toISOString()
  }, { merge: true });

  // Update a top-level document for the thread to help with discovery
  const threadRef = doc(db, CHATS_COLLECTION, threadId);
  await setDoc(threadRef, {
    lastMessageAt: new Date().toISOString(),
    lastMessageText: msg.text,
    orderId: threadId,
    unreadByAdmin: !msg.readByAdmin,
    unreadByCustomer: !msg.readByCustomer,
    customerName: msg.senderName || msg.sender || 'زبون الدعم',
    customerPhone: msg.customerPhone || '',
    governorate: msg.governorate || 'العراق'
  }, { merge: true });
}

/**
 * Real-time synchronization for all chat threads for the admin dashboard
 */
export function subscribeToAllChatThreadsRealtime(
  onUpdate: (threads: any[]) => void
): Unsubscribe {
  const colRef = collection(db, CHATS_COLLECTION);
  const q = query(colRef, orderBy('lastMessageAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const threads: any[] = [];
      snapshot.docs.forEach((d) => {
        threads.push({
          ...d.data(),
          orderId: d.id
        });
      });
      onUpdate(threads);
    },
    (err) => {
      console.warn('Firestore all chats onSnapshot notice:', err);
    }
  );

  return unsubscribe;
}

/**
 * Delete a chat thread from Firestore
 */
export async function deleteChatThreadFromFirestore(orderId: string): Promise<void> {
  const threadId = orderId.toUpperCase();
  const threadRef = doc(db, CHATS_COLLECTION, threadId);
  await deleteDoc(threadRef);
}

/**
 * Mark all messages in a thread as read by Admin
 */
export async function markChatAsReadByAdmin(orderId: string): Promise<void> {
  const threadId = orderId.toUpperCase();
  const threadRef = doc(db, CHATS_COLLECTION, threadId);
  await setDoc(threadRef, { unreadByAdmin: false }, { merge: true });
}

/**
 * Sync all local chats from Express API into Firestore
 */
export async function syncAllLocalChatsToFirestore(): Promise<void> {
  try {
    const res = await fetch('/api/chats');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.threads) return;

    for (const thread of data.threads) {
      const orderId = thread.orderId.toUpperCase();
      const msgRes = await fetch(`/api/chats/${orderId}/messages`);
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        if (msgData && msgData.messages) {
          for (const msg of msgData.messages) {
            await sendChatMessageToFirestore(msg);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error syncing local chats to firestore:', error);
  }
}

