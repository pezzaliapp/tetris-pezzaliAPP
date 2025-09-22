// Tetris PWA — Service Worker (MIT)
const CACHE = 'tetris-pwa-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(res => res ||
      fetch(e.request).then(net => {
        // runtime cache for same-origin GET
        if (url.origin === location.origin){
          const clone = net.clone();
          caches.open(CACHE).then(c=>c.put(e.request, clone));
        }
        return net;
      }).catch(()=> caches.match('./index.html'))
    )
  );
});
