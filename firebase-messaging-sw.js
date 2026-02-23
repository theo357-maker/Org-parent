// ============================================
// SERVICE WORKER POUR NOTIFICATIONS FIREBASE
// VERSION CORRIGÉE - NOTIFICATIONS ARRIÈRE-PLAN
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================
// GESTION DES NOTIFICATIONS EN ARRIÈRE-PLAN
// ============================================

// Recevoir les notifications quand l'app est fermée
messaging.onBackgroundMessage((payload) => {
  console.log('📱 [SW] Notification reçue en arrière-plan:', payload);
  
  // Extraire les données
  const notificationTitle = payload.notification?.title || 
                           payload.data?.title || 
                           'Espace Parent - CS la Colombe';
  
  const notificationBody = payload.notification?.body || 
                          payload.data?.body || 
                          'Nouvelle notification';
  
  const data = payload.data || {};
  
  // Déterminer l'icône selon le type
  let icon = '/icon-192x192.png';
  let badge = '/icon-72x72.png';
  
  // Ajouter le logo de l'application
  if (data.type === 'incident') {
    icon = '/icon-192x192.png';
  } else if (data.type === 'notes') {
    icon = '/icon-192x192.png';
  } else if (data.type === 'presence') {
    icon = '/icon-192x192.png';
  } else if (data.type === 'devoir') {
    icon = '/icon-192x192.png';
  } else if (data.type === 'communique') {
    icon = '/icon-192x192.png';
  }
  
  // Options de la notification
  const notificationOptions = {
    body: notificationBody,
    icon: icon,
    badge: badge,
    tag: data.id || data.type || 'general',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      receivedAt: Date.now()
    },
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  // Afficher la notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================
// GESTION DES CLIKS SUR LES NOTIFICATIONS
// ============================================

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notification cliquée:', event.notification);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  // Ouvrir l'application
  if (action === 'open' || action === '') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Si une fenêtre est déjà ouverte, la focus
          for (const client of clientList) {
            if (client.url.includes('index.html') && 'focus' in client) {
              // Envoyer un message pour naviguer vers la page spécifique
              client.postMessage({
                type: 'NAVIGATE',
                page: data.page || 'dashboard',
                childId: data.childId,
                childName: data.childName
              });
              return client.focus();
            }
          }
          
          // Sinon, ouvrir une nouvelle fenêtre
          if (clients.openWindow) {
            let url = '/index.html';
            if (data.page) {
              url += `?page=${data.page}`;
              if (data.childId) url += `&child=${data.childId}`;
            }
            return clients.openWindow(url);
          }
        })
    );
  }
});

// ============================================
// GESTION DES MESSAGES DE L'APPLICATION
// ============================================

self.addEventListener('message', (event) => {
  console.log('📨 [SW] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    // Afficher une notification directement
    const data = event.data.data;
    
    self.registration.showNotification(data.title || 'Notification', {
      body: data.body || '',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-72x72.png',
      tag: data.tag || data.id || 'notification',
      data: {
        ...data,
        receivedAt: Date.now()
      },
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
  }
  
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    // Mettre à jour le badge de l'application
    if ('setAppBadge' in self.navigator) {
      const count = event.data.data?.count || 0;
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});

// ============================================
// MISE EN CACHE POUR OFFLINE
// ============================================

const CACHE_NAME = 'parent-app-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('🔄 [SW] Installation...');
  self.skipWaiting(); // Activer immédiatement
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 [SW] Mise en cache des ressources');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('❌ [SW] Erreur cache:', error);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Activé');
  // Nettoyer les anciens caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ [SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return clients.claim(); // Prendre le contrôle immédiatement
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes Firebase ou autres API
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('cloudinary')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache les réponses réussies
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec, essayer le cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Si c'est une navigation et que tout échoue, afficher offline.html
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          
          return new Response('Hors ligne', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
      })
  );
});

// ============================================
// GESTION DE LA SYNC EN ARRIÈRE-PLAN
// ============================================

self.addEventListener('sync', (event) => {
  console.log('🔄 [SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Synchroniser les notifications non lues
      syncNotifications()
    );
  }
});

async function syncNotifications() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('/api/notifications');
    if (response.ok) {
      const notifications = await response.json();
      // Traiter les nouvelles notifications
      notifications.forEach(notif => {
        self.registration.showNotification(notif.title, {
          body: notif.body,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: notif.id,
          data: notif,
          requireInteraction: true
        });
      });
    }
  } catch (error) {
    console.error('❌ [SW] Erreur synchronisation:', error);
  }
}