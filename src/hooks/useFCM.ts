import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase';
import { saveFCMToken } from '../services/db';
import { createLogger } from '../utils/logger';
import { useAuth } from '../context/AuthContext';

const log = createLogger('FCM');

export function useFCM() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupFCM = async () => {
      try {
        const msg = await messaging();
        if (!msg) {
          log.warn('FCM is not supported in this browser');
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          log.warn('Notification permission denied');
          return;
        }

        // Register SW with API key in URL to avoid hardcoding secrets
        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?apiKey=${apiKey}`
        );

        // Get token
        // In production, VAPID key is recommended, but Firebase default works without it in many cases
        const token = await getToken(msg, {
          vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          // The worker's ID is their phone number, which is stored in photoURL from anonymous auth
          const workerId = currentUser.photoURL || currentUser.uid;
          await saveFCMToken(workerId, token);
          log.info('FCM Token registered and saved');
        } else {
          log.warn('Failed to get FCM token');
        }

        // Listen for foreground messages
        onMessage(msg, (payload) => {
          log.info('Received foreground message', payload);
          if (payload.notification) {
            // Optional: show a custom in-app toast or alert here
            // For now, browser might show it or we can just rely on the SW in background
          }
        });

      } catch (err) {
        log.error('FCM setup failed', err);
      }
    };

    setupFCM();
  }, [currentUser]);
}
