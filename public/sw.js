const CACHE_NAME = 'fusion-tracker-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/placeholder.svg'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('Service Worker activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests for background sync
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Background Sync for location updates
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocationData());
  }
});

// Message handling for location tracking
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'LOCATION_UPDATE') {
    handleLocationUpdate(event.data.payload);
  }
  
  if (event.data && event.data.type === 'START_BACKGROUND_TRACKING') {
    startBackgroundLocationTracking();
  }
  
  if (event.data && event.data.type === 'STOP_BACKGROUND_TRACKING') {
    stopBackgroundLocationTracking();
  }
});

// Background location tracking state
let backgroundTrackingActive = false;
let watchId = null;
let locationBuffer = [];

// Start background location tracking
function startBackgroundLocationTracking() {
  console.log('Starting background location tracking...');
  backgroundTrackingActive = true;
  
  // Request persistent notification permission for background activity
  if ('Notification' in self && Notification.permission === 'granted') {
    showTrackingNotification();
  }
  
  // Start watching position if geolocation is available
  if ('geolocation' in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        
        console.log('Background location update:', locationData);
        handleLocationUpdate(locationData);
      },
      (error) => {
        console.error('Background geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000, // 1 minute
        timeout: 30000 // 30 seconds
      }
    );
  }
}

// Stop background location tracking
function stopBackgroundLocationTracking() {
  console.log('Stopping background location tracking...');
  backgroundTrackingActive = false;
  
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  // Hide tracking notification
  self.registration.getNotifications().then(notifications => {
    notifications.forEach(notification => {
      if (notification.tag === 'tracking-active') {
        notification.close();
      }
    });
  });
  
  // Sync any remaining location data
  if (locationBuffer.length > 0) {
    syncLocationData();
  }
}

// Handle location updates
function handleLocationUpdate(locationData) {
  // Add to buffer for batch sync
  locationBuffer.push(locationData);
  
  // Sync immediately if buffer is getting large or if we have good connectivity
  if (locationBuffer.length >= 10 || navigator.onLine) {
    syncLocationData();
  }
  
  // Send to active clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'LOCATION_UPDATE',
        payload: locationData
      });
    });
  });
}

// Sync location data to server
async function syncLocationData() {
  if (locationBuffer.length === 0) return;
  
  console.log(`Syncing ${locationBuffer.length} location updates...`);
  
  try {
    // Get employee ID from active clients
    const clients = await self.clients.matchAll();
    let employeeId = null;
    
    for (const client of clients) {
      client.postMessage({ type: 'GET_EMPLOYEE_ID' });
      // Note: In a real implementation, you'd need a way to get the employee ID
      // This is a simplified version
    }
    
    // Batch sync location updates
    const locationsToSync = [...locationBuffer];
    locationBuffer = []; // Clear buffer
    
    for (const location of locationsToSync) {
      try {
        const response = await fetch(`/api/employees/${employeeId}/location`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        console.log('Location synced successfully');
      } catch (error) {
        console.error('Failed to sync location:', error);
        // Re-add failed locations to buffer for retry
        locationBuffer.push(location);
      }
    }
  } catch (error) {
    console.error('Location sync failed:', error);
  }
}

// Show persistent notification during tracking
function showTrackingNotification() {
  self.registration.showNotification('Fusion Tracker Active', {
    body: 'Location tracking is running in the background',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    tag: 'tracking-active',
    requireInteraction: false,
    silent: true,
    persistent: true,
    actions: [
      {
        action: 'stop',
        title: 'Stop Tracking'
      }
    ]
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  if (event.action === 'stop') {
    stopBackgroundLocationTracking();
  }
  
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Periodic background sync (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-backup') {
    event.waitUntil(syncLocationData());
  }
});

console.log('Service Worker loaded successfully');
