// Service worker: nhận Web Push và mở app khi bấm thông báo
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }
  const title = data.title || 'LinguaViet';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Đến giờ học rồi!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'langapp',
    renotify: true,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if ('navigate' in c) return c.navigate(url);
        return;
      }
    }
    return self.clients.openWindow(url);
  })());
});

// Không cache để luôn lấy bản mới nhất; có handler fetch để trình duyệt coi là PWA cài được
self.addEventListener('fetch', () => {});
