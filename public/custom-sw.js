import { precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// ── Precaché de assets estáticos generados por Next.js ───────────────────────
precacheAndRoute(self.__WB_MANIFEST);

// ── Imágenes: CacheFirst (sirve del caché, actualiza en background) ──────────
registerRoute(
  ({ request, url }) =>
    request.destination === "image" ||
    url.origin.includes("githubusercontent.com") ||
    url.hostname.includes("supabase.co"),
  new CacheFirst({
    cacheName: "franilover-images-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 días
      }),
    ],
  })
);

// ── Assets JS/CSS: StaleWhileRevalidate ──────────────────────────────────────
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style",
  new StaleWhileRevalidate({
    cacheName: "franilover-static-cache",
  })
);

// ── Navegación (páginas): NetworkFirst con fallback al caché ─────────────────
// Este es el fix clave: antes era NetworkOnly, que no tiene fallback offline.
// Ahora intenta la red primero; si falla, sirve la versión cacheada de la ruta.
const navigationHandler = new NetworkFirst({
  cacheName: "franilover-pages-cache",
  networkTimeoutSeconds: 5, // si la red tarda más de 5s, usa caché
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60, // 1 día
    }),
  ],
});

registerRoute(
  new NavigationRoute(navigationHandler)
);

// ── Instalación y activación ──────────────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notas") {
    console.log("SW: Detectada conexión. Iniciando sincronización...");
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: "/icon.png",
        badge: "/icon.png",
        image: data.image,
        vibrate: [100, 50, 100],
        data: { url: data.url || "/" }
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error("Error Push:", e);
    }
  }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});