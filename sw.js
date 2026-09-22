// Service worker: Vonk werkt ook offline zodra je hem één keer hebt geopend.

const VERSION = 'vonk-v2';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/views.css',
  'css/game.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
  'js/main.js',
  'js/util.js',
  'js/store.js',
  'js/parse.js',
  'js/check.js',
  'js/srs.js',
  'js/rewards.js',
  'js/ui.js',
  'js/data/langs.js',
  'js/data/samples.js',
  'js/fx/sound.js',
  'js/fx/haptics.js',
  'js/fx/confetti.js',
  'js/fx/speech.js',
  'js/games/stage.js',
  'js/games/scoring.js',
  'js/games/exercises.js',
  'js/games/results.js',
  'js/games/learn.js',
  'js/games/blitz.js',
  'js/games/match.js',
  'js/games/boss.js',
  'js/views/home.js',
  'js/views/lists.js',
  'js/views/awards.js',
  'js/views/profile.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Eigen bestanden: eerst netwerk (altijd de nieuwste versie), anders cache.
// Lettertypes: eerst cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
