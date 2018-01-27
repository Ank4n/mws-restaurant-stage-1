var staticCacheName = 'restaurant-reviews-cache-v1';

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll([
                'css/common.css',
                'css/main.css',
                'css/detail.css',
                'img/1.webp',
                'img/2.webp',
                'img/3.webp',
                'img/4.webp',
                'img/5.webp',
                'img/6.webp',
                'img/7.webp',
                'img/8.webp',
                'img/9.webp',
                'img/10.webp',
                'js/dbhelper.js',
                'js/main.js',
                'js/restaurant_info.js',
                'index.html',
                'restaurant.html'
            ]);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('restaurant-reviews-') &&
                        cacheName != staticCacheName;
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {

    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});

