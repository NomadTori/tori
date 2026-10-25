const V = 'hbc-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http') || r.url.includes('jsonbin.io')) return;

  // Aplikace: nejdřív síť (vždy čerstvá verze), offline z cache
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)).catch(() => {}); return res; })
        .catch(() => caches.match('index.html').then(x => x || caches.match('./')))
    );
    return;
  }

  // Ostatní (ikony, knihovny z CDN): z cache, na pozadí se obnoví
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)).catch(() => {}); }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
