(function () {
  if (!('serviceWorker' in navigator)) return;
  // Use a query-string version and bypass the old worker's cached sw.js.
  navigator.serviceWorker.register(new URL('sw.js?v=27', location.href), { updateViaCache: 'none' })
    .then((registration) => registration.update())
    .catch((error) => console.warn('Service worker update failed:', error.message));
})();
