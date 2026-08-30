// Firebase Cloud Messaging background service worker.
//
// Runs outside the Next.js bundle (plain static file served from /public),
// so it can't read process.env — the config below is the same
// NEXT_PUBLIC_FIREBASE_* values from .env.local. These are public client
// config (not secrets; they're already embedded in every page's JS bundle),
// safe to hardcode here. If the Firebase web app config ever changes,
// update this file to match.
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCKqSlAuw8DigPEVWFA2chUjTgSzqvxs5I',
  authDomain: 'mamanet-d3bad.firebaseapp.com',
  projectId: 'mamanet-d3bad',
  storageBucket: 'mamanet-d3bad.firebasestorage.app',
  messagingSenderId: '200450747273',
  appId: '1:200450747273:web:f961f1b931b85664c0cf58',
});

const messaging = firebase.messaging();

// Fires when a push arrives while the app isn't in the foreground —
// the case that matters most for "1 hour before" / "registration opened"
// reminders, since players usually aren't staring at the dashboard.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'מאמאנט';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
  });
});
