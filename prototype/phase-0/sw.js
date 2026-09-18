/* Cognitive Care NER — web cache guard.
 * The web app is served directly by Node/ZopCloud. Do not cache application
 * HTML/JS here: deployment revisions must become visible immediately.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});
