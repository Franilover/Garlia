import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

// ── Precaché de assets estáticos generados por Next.js ───────────────────────
precacheAndRoute(self.__WB_MANIFEST);

// ── Imágenes: CacheFirst ──────────────────────────────────────────────────────
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
        maxAgeSeconds: 60 * 24 * 60 * 60,
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

// ── Navegación: NetworkFirst con fallback al caché ───────────────────────────
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "franilover-pages-cache",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
        }),
      ],
    })
  )
);

// ── Precaché de TODAS las rutas al instalar ───────────────────────────────────
// Garantiza que todas las páginas estén offline desde el primer deploy,
// sin necesidad de visitarlas una por una.
const APP_ROUTES = [
  "/",
  "/personal",
  "/personal/escritorio",
  "/personal/salud",
  "/personal/dibujos",
  "/personal/fotos",
  "/personal/ropa",
  "/personal/sobre-mi",
  "/wiki",
  "/wiki/enciclopedia",
  "/wiki/canciones",
  "/wiki/libros",
  "/wiki/mapa",
  "/wiki/personal",
  "/auth/login",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open("franilover-pages-cache").then((cache) =>
      Promise.allSettled(
        APP_ROUTES.map((route) =>
          cache.add(new Request(route, { credentials: "same-origin" }))
            .catch((err) => console.warn(`[SW] No se pudo cachear ${route}:`, err))
        )
      )
    )
  );
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