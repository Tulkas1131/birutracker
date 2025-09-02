
// This basic service worker is for PWA installation purposes.
// It doesn't implement any caching strategies.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // The new service worker will not activate until all tabs are closed
  // or until we manually call skipWaiting(). We will do the latter
  // when the user clicks the "Update" button.
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // This forces the SW to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // This service worker doesn't cache anything, so it just
  // lets the network requests pass through.
  event.respondWith(fetch(event.request));
});

// This listener waits for a message from the client (our React app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
});
