// This is a basic service worker to enable PWA installation.
// It doesn't do any caching yet, but its presence is required.

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // We are not intercepting fetch requests for now.
  // This allows the app to work online-first.
});
