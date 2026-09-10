// Service Worker: sw.js
// Scope: Root Domain Scope ('/')

self.addEventListener('install', (event) => {
  // Activate immediately so newly registered service worker takes control
  self.skipWaiting();
  console.log('[Service Worker] Installed.');
});

self.addEventListener('activate', (event) => {
  // Take control of all existing clients within scope immediately
  event.waitUntil(self.clients.claim());
  console.log('[Service Worker] Activated and controlling scope.');
});

/**
 * Handle incoming Web Push payload
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received.');

  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      payload = {
        title: 'Web Push Notification',
        body: event.data.text()
      };
    }
  }

  const title = payload.title || 'Web Push Alert';
  const options = {
    body: payload.body || 'You have received a new update.',
    icon: payload.icon || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    badge: payload.badge || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    image: payload.image || undefined,
    vibrate: payload.vibrate || [100, 50, 100],
    data: {
      url: payload.url || '/',
      dateOfArrival: Date.now()
    },
    actions: payload.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle notification click and navigation
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  const destination = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Focus existing window if URL matches
      for (const client of windowClients) {
        if (client.url === destination && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. Focus existing open window from same origin and navigate it
      for (const client of windowClients) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => client.navigate(destination));
        }
      }
      // 3. Open new window if none open
      if (clients.openWindow) {
        return clients.openWindow(destination);
      }
    })
  );
});
