const port = 1337;
let idb = window.indexedDB;
var db;

class DBHelper {
    /**
     * Common database helper functions.
     */

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get RESTAURANTS_URL() {
        return `http://localhost:${port}/restaurants`;
    }

    static RESTAURANTS_BY_ID_URL(id) {
        return `http://localhost:${port}/restaurants/` + id;
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurantsFromNetwork(callback) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.RESTAURANTS_URL);
        xhr.onload = () => {
            if (xhr.status === 200) { // Got a success response from server!
                const restaurants = JSON.parse(xhr.responseText);
                this.persist(restaurants);
                callback(null, restaurants);
            } else { // Oops!. Got an error from server.
                const error = (`Request failed. Returned status of ${xhr.status}`);
                callback(error, null);
            }
        };
        xhr.send();
    }

    static fetchRestaurants(callback, update) {
        this.fetchCachedRestaurants((error, cached) => {
            if (error || update) {
                this.fetchRestaurantsFromNetwork((networkError, restaurants) => {
                    if (networkError) {
                        if (cached) {
                            callback(null, cached);
                            return;
                        }
                        callback(networkError, null);
                    }
                    else {
                        callback(null, restaurants);
                    }
                })
            }
            else callback(null, cached);

        });
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {

        this.fetchCachedRestaurantById(id, (error, cached) => {
            if (cached) callback(null, cached);
            else this.fetchRestaurantByIdFromNetwork(id, callback);

        });


    }

    static fetchRestaurantByIdFromNetwork(id, callback){
        let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.RESTAURANTS_BY_ID_URL(id));
        xhr.onload = () => {
            if (xhr.status === 200) { // Got a success response from server!
                const restaurant = JSON.parse(xhr.responseText);
                restaurant.id = Number(id);
                this.persist([restaurant]);
                callback(null, restaurant);
            } else { // Oops!. Got an error from server.
                const error = (`Request failed. Returned status of ${xhr.status}`);
                callback(error, null);
            }
        };
        xhr.send();
    }
    static fetchCachedRestaurantById(id, callback){
        if (!db) return callback("db not initialised", null);

        var request = db.transaction('restaurants')
            .objectStore('restaurants').get(Number(id));

        request.onsuccess = function () {
            callback(null, request.result);
        };
    }
    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        }, false);
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        }, false);
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        }, false);
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        }, false);
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        }, false);
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        if (restaurant.photograph === undefined) return `/img/no-image.webp`;
        return (`/img/${restaurant.photograph}.webp`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
                position: restaurant.latlng,
                title: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant),
                map: map,
                animation: google.maps.Animation.DROP
            }
        );
        return marker;
    }

    static openDb(callback) {
        if (db) return;
        let dbRequest = idb.open('restaurant-reviews', 1);

        dbRequest.onupgradeneeded = function (event) {

            db = event.target.result;
            var store = dbRequest.result.createObjectStore('restaurants', {
                keyPath: 'id'
            });
            store.createIndex('neighborhoods', 'neighborhood');
            store.createIndex('cuisines', 'cuisine_type');
        };

        dbRequest.onsuccess = function (event) {
            db = event.target.result;
            callback(true);
        };

        dbRequest.onerror = function (event) {
            console.error("db error");
            callback(false);
        }
    }

    static fetchCachedRestaurants(callback) {

        if (!db) {
            const error = (`Not able to get cached restaurants, db not found`);
            callback(error, null);
            return;
        }

        var objectStore = db.transaction('restaurants')
            .objectStore('restaurants');

        var cached = [];

        objectStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if(cursor) {
                cached.push(cursor.value);
                cursor.continue();
            } else {
                if (cached.length > 0) {
                    callback(null, cached)
                } else {
                    const error = (`No cached restaurants`);
                    callback(error, null);
                }
            }
        };

    }


    static persist(restaurants) {
        if (!db) return;
        var tx = db.transaction('restaurants', 'readwrite');
        var store = tx.objectStore('restaurants');
        restaurants.forEach(function (restaurant) {
            store.put(restaurant);
        });
    }


}
