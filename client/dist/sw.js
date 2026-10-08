const CACHE_NAME = "taskwake-cache-v2";

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
    caches
      .open(CACHE_NAME)
      .then((cache) => {
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
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }

            return null;
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/*
|--------------------------------------------------------------------------
| FETCH
|--------------------------------------------------------------------------
*/

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Navigation requests
  |--------------------------------------------------------------------------
  |
  | /dashboard
  | /login
  | /register
  |
  | React app ke liye index page return karna hai.
  |
  */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/"))
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | API requests ko cache mat karo
  |--------------------------------------------------------------------------
  */

  if (
    request.url.includes(
      "localhost:5000"
    ) ||
    request.url.includes("/api/")
  ) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Static files
  |--------------------------------------------------------------------------
  */

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          const responseClone =
            networkResponse.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(
                request,
                responseClone
              );
            });

          return networkResponse;
        })
        .catch(() => {
          return new Response(
            "TaskWake is currently offline.",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain",
              },
            }
          );
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
            if (
              "focus" in client
            ) {
              client.navigate(
                "/dashboard"
              );

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