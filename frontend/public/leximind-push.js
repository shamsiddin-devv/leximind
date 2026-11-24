const scope = new URL(self.registration.scope);
const routes = new Set(['dashboard', 'friends', 'review-center', 'study-plan', 'learning-calendar', 'achievements', 'statistics', 'settings/notifications']);

function destination(path) {
  if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
    const url = new URL(path.slice(1), scope);
    const route = url.pathname.slice(scope.pathname.length);
    if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname) && routes.has(route)) {
      url.hash = '';
      if (route !== 'friends' || url.search !== '?kind=incoming') url.search = '';
      return url.href;
    }
  }
  return new URL('dashboard', scope).href;
}

self.addEventListener('push', (event) => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  if (typeof payload?.title !== 'string' || typeof payload.body !== 'string') return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    data: { url: destination(payload.path) },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const next = event.notification.data?.url;
    const url = typeof next === 'string' && next.startsWith(scope.href) ? next : destination();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const exact = windows.find((client) => client.url === url);
    if (exact) await exact.focus();
    else await self.clients.openWindow(url);
  })());
});
