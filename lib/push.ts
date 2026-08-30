'use client';

import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';

// Web Push (VAPID) key — Firebase Console → Project settings → Cloud Messaging
// tab → "Web Push certificates" → generate a key pair, paste the value here.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type PushPermissionResult = 'granted' | 'denied' | 'unsupported' | 'error';

// Registers the background service worker, requests notification permission,
// and — if granted — saves this device's FCM token onto the player/coach's
// own user doc so the server can target pushes at her later.
export async function enablePushNotifications(uid: string): Promise<PushPermissionResult> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  if (!app || !db || !VAPID_KEY) {
    console.error('enablePushNotifications: Firebase app/db or NEXT_PUBLIC_FIREBASE_VAPID_KEY not configured.');
    return 'error';
  }
  if (!(await isSupported())) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return 'error';

    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
    return 'granted';
  } catch (err) {
    console.error('enablePushNotifications failed:', err);
    return 'error';
  }
}

// Foreground messages (app open in an active tab) don't trigger the service
// worker's onBackgroundMessage — show them manually via this listener.
export async function listenForForegroundPush(onNotification: (title: string, body: string) => void) {
  if (typeof window === 'undefined' || !app || !(await isSupported())) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    onNotification(payload.notification?.title ?? 'מאמאנט', payload.notification?.body ?? '');
  });
}
