// SparkVibe Service Worker for Push Notifications and Offline Support
const CACHE_NAME = 'sparkvibe-cache-v2.1.2'; // Updated version
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge-72x72.png',
  '/default-avatar.png',
  '/offline.html',
];

// Install event - cache resources with detailed error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('SparkVibe cache opened');
        const failedResources = [];
        for (const url of urlsToCache) {
          try {
            const response = await fetch(url, { mode: 'no-cors' }); // Use no-cors to avoid CORS issues
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            await cache.put(url, response);
            console.log(`Cached: ${url}`);
          } catch (error) {
            console.error(`Failed to cache ${url}:`, error.message);
            failedResources.push({ url, error: error.message });
          }
        }
        // Ensure offline.html is cached
        try {
          const response = await fetch(OFFLINE_URL, { mode: 'no-cors' });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          await cache.put(OFFLINE_URL, response);
          console.log(`Offline page cached: ${OFFLINE_URL}`);
        } catch (error) {
          console.error(`Failed to cache offline page: ${error.message}`);
          failedResources.push({ url: OFFLINE_URL, error: error.message });
        }
        // Log summary of failed resources
        if (failedResources.length > 0) {
          console.warn('Cache installation completed with errors:', failedResources);
        }
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
  const requestUrl = new URL(event.request.url);
  if (event.request.mode === 'navigate' || requestUrl.pathname === '/offline.html') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => cache.match(OFFLINE_URL))
            .then((response) => response || new Response('Offline page not found', { status: 404 }));
        })
    );
  } else if (requestUrl.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok && response.status === 404) {
            console.warn(`API request failed: ${requestUrl}`);
            return new Response(JSON.stringify({ error: 'API unavailable offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return response;
        })
        .catch(() => {
          return new Response(JSON.stringify({ error: 'API unavailable offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
        .catch((error) => {
          console.error(`Fetch failed for ${event.request.url}:`, error);
          return new Response('Resource unavailable', { status: 503 });
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
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
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
      { action: 'open', title: 'Open SparkVibe', icon: '/icon-192x192.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/close-icon.png' },
    ],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => console.log('Notification displayed successfully'))
      .catch((error) => console.error('Error displaying notification:', error))
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
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            return client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }).catch((error) => {
      console.error('Error handling notification click:', error);
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'share-card') {
    event.waitUntil(syncShareActions());
  } else if (event.tag === 'mood-analysis') {
    event.waitUntil(syncMoodAnalyses());
  }
});

// Sync pending share actions when back online
async function syncShareActions() {
  try {
    const cache = await caches.open('sparkvibe-pending-actions');
    const requests = await cache.keys();

    const shareRequests = requests.filter((request) => request.url.includes('/track-share'));

    for (const request of shareRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('Share action synced successfully:', request.url);
        } else {
          console.warn('Share sync failed for:', request.url, response.status);
        }
      } catch (error) {
        console.error('Failed to sync share action:', request.url, error);
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

    const moodRequests = requests.filter((request) => request.url.includes('/analyze-mood'));

    for (const request of moodRequests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('Mood analysis synced successfully:', request.url);
        } else {
          console.warn('Mood sync failed for:', request.url, response.status);
        }
      } catch (error) {
        console.error('Failed to sync mood analysis:', request.url, error);
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

// Check user streak by fetching from server
async function checkUserStreak() {
  try {
    const response = await fetch('/api/user/streak', {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Streak fetch failed: ${response.status}`);
    }
    const data = await response.json();
    const lastActivity = data.lastActivity ? new Date(data.lastActivity) : null;
    const now = new Date();
    const daysSince = lastActivity ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)) : null;

    if (daysSince === 1) {
      await self.registration.showNotification('Keep Your Streak Alive!', {
        body: "Complete today's adventure to maintain your streak!",
        icon: '/icon-192x192.png',
        tag: 'streak-reminder',
        data: { url: '/' },
      });
    }
  } catch (error) {
    console.error('Error checking streak:', error);
  }
}

console.log('SparkVibe Service Worker v2.1.2 loaded');