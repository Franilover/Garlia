import { precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";


precacheAndRoute(self.__WB_MANIFEST);


registerRoute(
  ({ request, url }) => 
    request.destination === "image" || 
    url.origin.includes("githubusercontent.com"),
  new CacheFirst({
    cacheName: "franilover-images-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 24 * 60 * 60, 
      }),
    ],
  })
);


const networkOnly = new NetworkOnly();
const navigationRoute = new NavigationRoute(async (params) => {
  try {
    return await networkOnly.handle(params);
  } catch (error) {
    return caches.match("/index.html") || caches.match("/");
  }
});
registerRoute(navigationRoute);


self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});



self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notas") {
    console.log("SW: Detectada conexión. Iniciando sincronización de notas...");
    
  }
});


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