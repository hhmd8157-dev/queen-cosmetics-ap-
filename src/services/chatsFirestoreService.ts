import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
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
export async function sendChatMessageToFirestore(msg: ChatMessage): Promise<void> {
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
    unreadByCustomer: !msg.readByCustomer
  }, { merge: true });
}

/**
 * Mark all messages in a thread as read by Admin
 */
export async function markChatAsReadByAdmin(orderId: string): Promise<void> {
  const threadId = orderId.toUpperCase();
  const threadRef = doc(db, CHATS_COLLECTION, threadId);
  await setDoc(threadRef, { unreadByAdmin: false }, { merge: true });
  
  // Note: For deep subcollections, we usually mark individual messages if needed,
  // but updating the thread summary is often enough for the counter.
}
