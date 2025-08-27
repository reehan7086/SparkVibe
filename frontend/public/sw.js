// SparkVibe Service Worker for Push Notifications
const CACHE_NAME = 'sparkvibe-cache-v2.1.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SparkVibe cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match(OFFLINE_URL);
            });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'SparkVibe',
    body: 'You have a new notification!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'sparkvibe-notification',
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload
      };
    } catch (error) {
      console.error('Error parsing push payload:', error);
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    actions: [
      {
        action: 'open',
        title: 'Open SparkVibe',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/close-icon.png'
      }
    ],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log('Notification displayed successfully');
      })
      .catch((error) => {
        console.error('Error displaying notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if SparkVibe is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }

      // Open new window if not already open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'share-card') {
    event.waitUntil(syncShareActions());
  }
  
  if (event.tag === 'mood-analysis') {
    event.waitUntil(syncMoodAnalyses());
  }
});

// Sync pending share actions when back online
async function syncShareActions() {
  try {
    const cache = await caches.open('sparkvibe-pending-actions');
    const requests = await cache.keys();
    
    const shareRequests = requests.filter(request => 
      request.url.includes('/track-share')
    );

    for (const request of shareRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('Share action synced successfully');
        }
      } catch (error) {
        console.error('Failed to sync share action:', error);
      }
    }
  } catch (error) {
    console.error('Error during share sync:', error);
  }
}

// Sync pending mood analyses when back online
async function syncMoodAnalyses() {
  try {
    const cache = await caches.open('sparkvibe-pending-actions');
    const requests = await cache.keys();
    
    const moodRequests = requests.filter(request => 
      request.url.includes('/analyze-mood')
    );

    for (const request of moodRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('Mood analysis synced successfully');
        }
      } catch (error) {
        console.error('Failed to sync mood analysis:', error);
      }
    }
  } catch (error) {
    console.error('Error during mood sync:', error);
  }
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync for streak maintenance
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-streak') {
    event.waitUntil(checkUserStreak());
  }
});

async function checkUserStreak() {
  // Check if user maintained their streak and send reminder if needed
  try {
    const lastActivity = localStorage.getItem('sparkvibe_last_activity');
    const now = new Date();
    const lastActivityDate = lastActivity ? new Date(lastActivity) : null;
    
    if (lastActivityDate) {
      const daysSince = Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24));
      
      if (daysSince === 1) {
        // Send streak reminder
        self.registration.showNotification('Keep Your Streak Alive!', {
          body: 'Complete today\'s adventure to maintain your streak!',
          icon: '/icon-192x192.png',
          tag: 'streak-reminder',
          data: { url: '/' }
        });
      }
    }
  } catch (error) {
    console.error('Error checking streak:', error);
  }
}

console.log('SparkVibe Service Worker v2.1.0 loaded');