import { routingService } from "./routingService";
import { LocationData } from "@shared/api";

// Test routing service with sample coordinates
export async function testRoutingService() {
  console.log("🚗 Testing Routing Service...");

  // Sample coordinates (New York area)
  const point1: LocationData = {
    lat: 40.7128,
    lng: -74.0060,
    address: "New York, NY",
    timestamp: new Date().toISOString()
  };

  const point2: LocationData = {
    lat: 40.7589,
    lng: -73.9851,
    address: "Times Square, NY",
    timestamp: new Date().toISOString()
  };

  const point3: LocationData = {
    lat: 40.7829,
    lng: -73.9654,
    address: "Central Park, NY",
    timestamp: new Date().toISOString()
  };

  try {
    // Test single route
    console.log("📍 Testing single route...");
    const singleRoute = await routingService.getRoute(point1, point2);
    console.log("✅ Single route result:", {
      coordinates: singleRoute.coordinates.length,
      distance: `${(singleRoute.distance / 1000).toFixed(2)} km`,
      duration: `${Math.round(singleRoute.duration / 60)} min`
    });

    // Test multi-point route
    console.log("🗺️ Testing multi-point route...");
    const multiRoute = await routingService.getRouteForPoints([point1, point2, point3]);
    console.log("✅ Multi-point route result:", {
      totalCoordinates: multiRoute.coordinates.length,
      totalDistance: `${(multiRoute.totalDistance / 1000).toFixed(2)} km`,
      segments: multiRoute.segments.length
    });

    console.log("🎉 Routing service test completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Routing service test failed:", error);
    return false;
  }
}

// Auto-run test if this module is imported in development
if (import.meta.env.DEV) {
  testRoutingService();
}
