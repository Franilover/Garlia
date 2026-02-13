import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// 1. INYECCIÓN DE MANIFIESTO
precacheAndRoute(self.__WB_MANIFEST);

// 2. CACHÉ DINÁMICA DE IMÁGENES (Para ver fotos sin internet)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-franilover-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
      }),
    ],
  })
);

// 3. EVENTO DE INSTALACIÓN
self.addEventListener('install', () => {
  console.log('SW: Instalando...');
  self.skipWaiting();
});

// 4. EVENTO DE ACTIVACIÓN
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 5. EVENTO PUSH
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        image: data.image,
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error('Error Push:', e);
    }
  }
});

// 6. EVENTO CLICK NOTIFICACIÓN
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});