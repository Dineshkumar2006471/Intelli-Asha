// firebase-messaging-sw.js — IntelliASHA Push Notification Service Worker
// Firebase config is public (it's in the HTML source anyway), so it's safe to hardcode here.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyASqsinqeZPGXrl1rdAJYlshxP_1G2o5ek',
  authDomain: 'kavach-hackathon-500511.firebaseapp.com',
  projectId: 'kavach-hackathon-500511',
  storageBucket: 'kavach-hackathon-500511.firebasestorage.app',
  messagingSenderId: '97454001548',
  appId: '1:97454001548:web:0b68d20e737fef257d1aa9',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'IntelliASHA Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New alert from IntelliASHA',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
