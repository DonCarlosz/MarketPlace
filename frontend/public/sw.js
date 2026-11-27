// oBuy Progressive Web App Service Worker (v9: Offline Shell + Web Push + Web Share Target + iOS Zero-Zoom Guards)
const STATIC_CACHE = 'obuy-static-v9';
const RUNTIME_CACHE = 'obuy-runtime-v9';
const SHARE_TARGET_CACHE = 'obuy-share-target-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// Install: Pre-cache core app shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache versions and claim open clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== STATIC_CACHE && name !== RUNTIME_CACHE && name !== SHARE_TARGET_CACHE) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Handle Web Share Target POST (/share-target) -> store photos & metadata in Cache API, redirect to /create?shared=1
async function handleShareTargetPost(request) {
  try {
    const formData = await request.formData();
    const title = String(formData.get('title') || '').trim();
    const text = String(formData.get('text') || '').trim();
    const url = String(formData.get('url') || '').trim();
    const rawFiles = formData.getAll('photos').filter((item) => item && typeof item.arrayBuffer === 'function');

    const cache = await caches.open(SHARE_TARGET_CACHE);
    const existingKeys = await cache.keys();
    await Promise.all(existingKeys.map((k) => cache.delete(k)));

    const savedFileKeys = [];
    for (let i = 0; i < Math.min(rawFiles.length, 6); i += 1) {
      const file = rawFiles[i];
      const fileKey = `/__shared_photo_${i}`;
      await cache.put(
        fileKey,
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            'X-File-Name': encodeURIComponent(file.name || `shared-photo-${i + 1}.jpg`),
          },
        })
      );
      savedFileKeys.push(fileKey);
    }

    await cache.put(
      '/__shared_meta',
      new Response(JSON.stringify({ title, text, url, files: savedFileKeys, sharedAt: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch {
    // Redirect cleanly to /create even if share payload was empty
  }

  return Response.redirect('/create?shared=1', 303);
}

// Fetch: High-speed PWA caching strategy + Web Share Target receiver
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept Android/OS Web Share Target POSTs
  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/share-target') {
    event.respondWith(handleShareTargetPost(request));
    return;
  }

  if (request.method !== 'GET') return;

  // Never intercept dynamic API calls, Socket.IO, or browser-extension requests (allow /api/media/ images to cache)
  if (
    !url.protocol.startsWith('http') ||
    (url.pathname.startsWith('/api') && !url.pathname.startsWith('/api/media/')) ||
    url.pathname.startsWith('/socket.io')
  ) {
    return;
  }

  // SPA Navigation: Network-first so users always get fresh app updates, with offline shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200 && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Hashed immutable Vite bundles (/assets/*) and local icons: Cache-first for instant native-like speed
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Fonts & Uploaded Images: Stale-while-revalidate with bounded runtime cache
  if (
    url.pathname.startsWith('/api/media/') ||
    url.pathname.startsWith('/uploads/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
  }
});

// W3C Web Push: Receive closed-app notifications for new messages, offers, and requests
self.addEventListener('push', (event) => {
  let payload = {
    title: 'oBuy',
    body: 'You have a new message on oBuy.',
    url: '/messages',
    tag: 'obuy-notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    (async () => {
      // Update home-screen icon badge even when app is closed
      if (typeof payload.unreadCount === 'number' && self.navigator?.setAppBadge) {
        try {
          if (payload.unreadCount > 0) {
            await self.navigator.setAppBadge(payload.unreadCount);
          } else if (self.navigator?.clearAppBadge) {
            await self.navigator.clearAppBadge();
          }
        } catch {
          // Ignore badging errors in background context
        }
      }

      // Avoid showing duplicate OS banner if user already has this exact conversation open & focused
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const hasVisibleMatchingClient = windowClients.some(
        (client) =>
          client.visibilityState === 'visible' &&
          client.focused &&
          payload.url &&
          client.url.includes(payload.url)
      );
      if (hasVisibleMatchingClient) return;

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/icon-192.png',
        tag: payload.tag || 'obuy-notification',
        renotify: true,
        vibrate: [100, 50, 100],
        data: { url: payload.url || '/messages' },
      });
    })()
  );
});

// Tapping a lock-screen or tray notification opens/focuses oBuy directly to the relevant chat thread
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/messages';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Ignore navigate restriction
            }
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
