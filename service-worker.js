// Service worker калькулятора смет.
// Стратегия: stale-while-revalidate — сразу отдаём то, что есть в кеше (быстро и работает офлайн),
// и в фоне обновляем кеш из сети, если она есть. Версию кеша (CACHE_NAME) увеличивайте при каждом
// заметном обновлении index.html, чтобы у пользователей подтянулась новая версия.
const CACHE_NAME = 'smeta-calc-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  // Внешние библиотеки — без них приложение не запустится офлайн, поэтому кешируем и их.
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('SW: не удалось закешировать часть ресурсов при установке', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; // не кешируем не-GET запросы (на будущее, сейчас таких нет)

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // сети нет — отдаём то, что уже в кеше (если есть)

      return cached || networkFetch;
    })
  );
});
