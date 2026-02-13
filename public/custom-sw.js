import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// 1. INYECCIÓN DE MANIFIESTO (Obligatorio para next-pwa)
// Esto guarda los archivos locales (JS, CSS, HTML) generados en el build.
precacheAndRoute(self.__WB_MANIFEST);

// 2. CACHÉ DE IMÁGENES (GitHub y locales)
// Captura imágenes de tu repo de GitHub y las guarda hasta por 60 días.
registerRoute(
  ({ request, url }) => 
    request.destination === 'image' || 
    url.origin.includes('githubusercontent.com'),
  new CacheFirst({
    cacheName: 'franilover-images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 24 * 60 * 60, 
      }),
    ],
  })
);

// 3. ESTRATEGIA DE NAVEGACIÓN (Evita la pantalla "No internet connection")
const networkOnly = new NetworkOnly();

const navigationRoute = new NavigationRoute(async (params) => {
  try {
    // Intenta cargar por red siempre que sea posible
    return await networkOnly.handle(params);
  } catch (error) {
    // Si no hay internet, devuelve el index.html precacheado (el App Shell)
    return caches.match('/index.html') || caches.match('/');
  }
});

registerRoute(navigationRoute);

// 4. EVENTOS DE CICLO DE VIDA
self.addEventListener('install', () => {
  console.log('SW: Instalando y activando inmediatamente...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Listo para servir contenido offline.');
  event.waitUntil(clients.claim());
});

// 5. EVENTO PUSH (Notificaciones)
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