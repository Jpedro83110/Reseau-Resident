// Service Worker — Réseaux-Résident v2
// Trois caches versionnés : static, dynamic, api
const SW_VERSION = '2';
const CACHE_STATIC = `rr-static-v${SW_VERSION}`;
const CACHE_DYNAMIC = `rr-dynamic-v${SW_VERSION}`;
const CACHE_API = `rr-api-v${SW_VERSION}`;
const ALL_CACHES = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_API];

const PRECACHE = ['/', '/index.html', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

// Installation : pré-cache static
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_STATIC).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

// Activation : supprime les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Message : skipWaiting depuis le client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API Supabase → Network Only (pas de cache — données potentiellement sensibles/auth)
  if (url.hostname.includes('supabase.co')) return;

  // Serverless → Network Only
  if (url.pathname.startsWith('/api/')) return;

  // Assets statiques → Cache First + cache static
  if (/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Pages HTML → Network First + cache dynamic + offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_DYNAMIC).then((c) => c.put(request, clone));
        return res;
      }).catch(() => caches.match(request).then((c) => c || caches.match('/') || offlinePage()))
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) { const c = await caches.open(cacheName); c.put(request, res.clone()); }
  return res;
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res.ok) { const c = await caches.open(cacheName); c.put(request, res.clone()); }
    return res;
  } catch {
    return (await caches.match(request)) || new Response('{"error":"Hors ligne"}', {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }
}

function offlinePage() {
  return new Response(
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F9FAFB;color:#1c1c1c;text-align:center;padding:2rem}button{background:#1a3a5c;color:white;border:none;padding:.75rem 1.5rem;border-radius:.75rem;font-weight:bold;cursor:pointer;margin-top:1rem}</style></head><body><div><h1>Vous êtes hors ligne</h1><p>Vérifiez votre connexion et réessayez.</p><button onclick="location.reload()">Réessayer</button></div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
