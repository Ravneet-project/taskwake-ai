const CACHE_NAME = "taskwake-cache-v3";

const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/pwa-192.png",
  "/pwa-512.png",
];

/*
|--------------------------------------------------------------------------
| INSTALL
|--------------------------------------------------------------------------
*/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

/*
|--------------------------------------------------------------------------
| ACTIVATE
|--------------------------------------------------------------------------
*/

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName !== CACHE_NAME
          )
          .map((cacheName) =>
            caches.delete(cacheName)
          )
      );
    })
  );

  self.clients.claim();
});

/*
|--------------------------------------------------------------------------
| FETCH
|--------------------------------------------------------------------------
*/

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /*
  |--------------------------------------------------------------------------
  | ONLY HANDLE HTTP / HTTPS
  |--------------------------------------------------------------------------
  */

  if (
    !request.url.startsWith("http://") &&
    !request.url.startsWith("https://")
  ) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | ONLY GET REQUESTS
  |--------------------------------------------------------------------------
  */

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
  |--------------------------------------------------------------------------
  | IGNORE OTHER ORIGINS / EXTENSIONS
  |--------------------------------------------------------------------------
  */

  if (url.origin !== self.location.origin) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | NAVIGATION
  |--------------------------------------------------------------------------
  */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/");
      })
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | STATIC FILES
  |--------------------------------------------------------------------------
  */

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200
        ) {
          return networkResponse;
        }

        const responseClone =
          networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(
            request,
            responseClone
          );
        });

        return networkResponse;
      });
    })
  );
});

/*
|--------------------------------------------------------------------------
| NOTIFICATION CLICK
|--------------------------------------------------------------------------
*/

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if ("focus" in client) {
              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(
              "/dashboard"
            );
          }

          return null;
        })
    );
  }
);