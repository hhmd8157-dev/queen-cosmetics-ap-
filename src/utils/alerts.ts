/**
 * Web Push Notifications & High-Volume Royal Sound Alert Utility
 * Specifically engineered for "Father's Order Reception Device" (جهاز الوالد)
 */

import { formatIQD } from '../data/products';

let globalAudioCtx: AudioContext | null = null;

// Initialize / Resume AudioContext on user interaction (e.g. PIN submit or Test Sound button)
export function initAudioContext(): AudioContext | null {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!globalAudioCtx) {
      globalAudioCtx = new AudioCtxClass();
    }

    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }

    return globalAudioCtx;
  } catch (err) {
    console.warn('AudioContext initialization error:', err);
    return null;
  }
}

/**
 * Play a high-volume, distinct, royal multi-tone alert sound
 * Designed to be clearly audible from a distance and distinct from standard phone pings.
 */
export function playRoyalOrderChime(volume: number = 0.85, repeatCount: number = 2) {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(Math.max(volume, 0.1), 1.0), now);
    masterGain.connect(ctx.destination);

    // Chime notes: Royal Fanfare sequence (C5, E5, G5, C6) + (E5, G5, C6, E6)
    const playChordBurst = (startTime: number, pitchOffset: number = 0) => {
      const freqs = [
        523.25 * pitchOffset, // C5
        659.25 * pitchOffset, // E5
        783.99 * pitchOffset, // G5
        1046.50 * pitchOffset, // C6
      ];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        // Combination of sine (pure bell) and triangle (warm harmonics)
        osc.type = idx === 3 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

        // Crisp strike envelope with long shimmering decay
        noteGain.gain.setValueAtTime(0, startTime + idx * 0.08);
        noteGain.gain.linearRampToValueAtTime(0.28, startTime + idx * 0.08 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.65);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(startTime + idx * 0.08);
        osc.stop(startTime + idx * 0.08 + 0.7);
      });

      // Extra bell shimmer on top for brightness
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(1318.51 * pitchOffset, startTime + 0.24); // E6

      bellGain.gain.setValueAtTime(0, startTime + 0.24);
      bellGain.gain.linearRampToValueAtTime(0.35, startTime + 0.26);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.95);

      bellOsc.connect(bellGain);
      bellGain.connect(masterGain);

      bellOsc.start(startTime + 0.24);
      bellOsc.stop(startTime + 1.0);
    };

    // First burst
    playChordBurst(now, 1.0);

    // Second repeated burst for high urgency
    if (repeatCount >= 2) {
      playChordBurst(now + 0.55, 1.122); // Ascending pitch
    }

    // Third burst if requested
    if (repeatCount >= 3) {
      playChordBurst(now + 1.1, 1.259);
    }
  } catch (err) {
    console.warn('Failed to play royal audio chime:', err);
  }
}

/**
 * Short gentle confirmation tone (when logging in or enabling settings)
 */
export function playSuccessChime() {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.12); // A5

    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
}

/**
 * Request Web Push / Browser Notification permission
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Check if notifications are allowed
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Trigger device vibration (Android / Mobile browsers)
 */
export function triggerDeviceVibration(pattern: number[] = [300, 100, 300, 100, 600]) {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.warn('Vibration API not available:', err);
  }
}

export interface NewOrderNotificationData {
  id: string;
  trackingCode: string;
  customer: {
    name: string;
    phone: string;
    governorate: string;
    district?: string;
    address: string;
  };
  total: number;
}

/**
 * Show a browser push notification with rich info and vibration
 */
export function showOrderPushNotification(order: NewOrderNotificationData) {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const area = order.customer.district || order.customer.address || order.customer.governorate;
    const title = `👑 طلب جديد وصل! #${order.trackingCode}`;
    const body = `👤 الزبون: ${order.customer.name}\n💰 المبلغ: ${formatIQD(order.total)}\n📍 العنوان: ${order.customer.governorate} - ${area}`;

    const notification = new Notification(title, {
      body,
      icon: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=192',
      badge: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=96',
      tag: `queen-order-${order.id}`,
      requireInteraction: true, // Keep notification active until clicked
      silent: false,
      // @ts-ignore
      renotify: true,
    });

    notification.onclick = () => {
      try {
        window.focus();
        notification.close();
      } catch {}
    };

    return notification;
  } catch (err) {
    console.warn('Failed to display browser notification:', err);
    return null;
  }
}

/**
 * Show a browser push notification for new chat messages
 */
export function showChatPushNotification(
  data: { orderId: string; customerName: string; text: string },
  onClick?: () => void
) {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const title = `💬 رسالة جديدة - رمز التتبع: #${data.orderId}`;
    const body = `${data.customerName}: ${data.text}`;

    const notification = new Notification(title, {
      body,
      icon: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=192',
      badge: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=96',
      tag: `queen-chat-${data.orderId}`,
      requireInteraction: true,
      silent: false,
      // @ts-ignore
      renotify: true,
    });

    notification.onclick = () => {
      try {
        window.focus();
        if (onClick) {
          onClick();
        }
        notification.close();
      } catch {}
    };

    return notification;
  } catch (err) {
    console.warn('Failed to display browser chat notification:', err);
    return null;
  }
}

/**
 * Cross-tab Real-time Broadcast Channel
 */
let broadcastChannelInstance: BroadcastChannel | null = null;

export function getOrdersBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  if (!broadcastChannelInstance) {
    try {
      broadcastChannelInstance = new BroadcastChannel('queen_orders_live_channel');
    } catch {
      return null;
    }
  }
  return broadcastChannelInstance;
}

export function broadcastNewOrderLocally(order: NewOrderNotificationData) {
  try {
    const channel = getOrdersBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'NEW_ORDER', order, timestamp: Date.now() });
    }
    // Also dispatch on window for same-tab listeners
    window.dispatchEvent(new CustomEvent('queen_new_order_event', { detail: order }));
  } catch (err) {
    console.warn('Broadcast channel error:', err);
  }
}

export interface OrderStatusChangeNotification {
  orderId: string;
  trackingCode: string;
  previousStatus?: string;
  newStatus: string;
  customerName?: string;
  driverNotes?: string;
  timestamp: string;
}

export function broadcastOrderStatusChangeLocally(payload: OrderStatusChangeNotification) {
  try {
    const channel = getOrdersBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'ORDER_STATUS_CHANGED', payload, timestamp: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('queen_order_status_change', { detail: payload }));
  } catch (err) {
    console.warn('Broadcast status change error:', err);
  }
}

/**
 * Play a pleasant status-specific notification sound for customers
 */
export function playStatusNotificationSound(status: string) {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.connect(ctx.destination);

    if (status === 'delivered') {
      // Celebratory cheerful fanfare (G5 -> C6 -> E6 -> G6)
      const freqs = [783.99, 1046.50, 1318.51, 1567.98];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = i === 3 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.1);

        noteGain.gain.setValueAtTime(0, now + i * 0.1);
        noteGain.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.45);

        osc.connect(noteGain);
        noteGain.connect(gain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    } else if (status === 'out_for_delivery') {
      // Dynamic upbeat rising chime (E5 -> A5 -> C#6)
      const freqs = [659.25, 880.00, 1108.73];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.12);

        noteGain.gain.setValueAtTime(0, now + i * 0.12);
        noteGain.gain.linearRampToValueAtTime(0.22, now + i * 0.12 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);

        osc.connect(noteGain);
        noteGain.connect(gain);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.55);
      });
    } else if (status === 'preparing') {
      // Warm gentle double bell (D5 -> G5)
      const freqs = [587.33, 783.99];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.15);

        noteGain.gain.setValueAtTime(0, now + i * 0.15);
        noteGain.gain.linearRampToValueAtTime(0.24, now + i * 0.15 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.6);

        osc.connect(noteGain);
        noteGain.connect(gain);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.65);
      });
    } else {
      // Standard gentle ping
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch (err) {
    console.warn('Status notification sound error:', err);
  }
}

