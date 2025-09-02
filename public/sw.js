
// A simple, no-op service worker that exists only to meet the PWA requirements.
// This makes the app installable.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Immediately move to the active state.
  // This is required for the update notification system.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Take control of all clients as soon as the service worker activates.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // This service worker does not intercept fetch requests.
  // It's a no-op, allowing all requests to go directly to the network.
  return;
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
