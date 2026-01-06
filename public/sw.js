// Service Worker for background notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    const payload = event.data.json();
    const options = {
      body: payload.message,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: payload.lot,
      data: {
        url: payload.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('Embroidery Challan', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});