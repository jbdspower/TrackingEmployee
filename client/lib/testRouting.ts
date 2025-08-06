// Test file to validate GPS routing functionality
import { LocationData } from "@shared/api";
import { routingService } from "./routingService";

// Test GPS route creation with sample data
export const testGPSRouting = () => {
  console.log("🧪 Testing GPS routing functionality...");

  // Sample GPS points (simulating employee movement)
  const sampleGPSPoints: LocationData[] = [
    {
      lat: 40.7128,
      lng: -74.006,
      address: "Start Location",
      timestamp: "2024-01-01T10:00:00Z",
    },
    {
      lat: 40.713,
      lng: -74.0058,
      address: "Point 1",
      timestamp: "2024-01-01T10:01:00Z",
    },
    {
      lat: 40.7135,
      lng: -74.0055,
      address: "Point 2",
      timestamp: "2024-01-01T10:02:00Z",
    },
    {
      lat: 40.714,
      lng: -74.005,
      address: "Point 3",
      timestamp: "2024-01-01T10:03:00Z",
    },
    {
      lat: 40.7145,
      lng: -74.0045,
      address: "End Location",
      timestamp: "2024-01-01T10:04:00Z",
    },
  ];

  // Test GPS route creation
  const gpsRoute = routingService.createGPSRoute(sampleGPSPoints);

  console.log("📍 GPS Route Result:", {
    source: gpsRoute.source,
    confidence: gpsRoute.confidence,
    coordinateCount: gpsRoute.coordinates.length,
    distance: `${(gpsRoute.distance / 1000).toFixed(2)} km`,
    duration: `${Math.round(gpsRoute.duration)} seconds`,
  });

  // Test edge cases
  console.log("🧪 Testing edge cases...");

  // Empty points
  const emptyRoute = routingService.createGPSRoute([]);
  console.log("Empty route:", emptyRoute);

  // Single point
  const singlePoint = routingService.createGPSRoute([sampleGPSPoints[0]]);
  console.log("Single point route:", singlePoint);

  return gpsRoute;
};

// Validate route display logic
export const validateRouteDisplay = (trackingSession: any) => {
  console.log("🗺️ Validating route display logic...");

  if (!trackingSession) {
    console.log("❌ No tracking session provided");
    return false;
  }

  if (!trackingSession.route || trackingSession.route.length < 2) {
    console.log("❌ Insufficient route data for display");
    return false;
  }

  console.log("✅ Route display validation passed:", {
    routePoints: trackingSession.route.length,
    hasStartLocation: !!trackingSession.startLocation,
    hasEndLocation: !!trackingSession.endLocation,
    status: trackingSession.status,
  });

  return true;
};

// Log key differences between GPS and API routing
export const logRoutingComparison = () => {
  console.log(`
🔍 ROUTING COMPARISON:

🟢 GPS TRACKING (RECOMMENDED):
- ✅ Shows EXACT path taken by employee
- ✅ High accuracy with real GPS coordinates
- ✅ No dependency on external APIs
- ✅ Works offline
- ✅ Captures actual employee behavior

🟡 ROAD API ROUTING:
- ⚠️ Shows theoretical road-based route
- ⚠️ May not match actual employee path
- ⚠️ Depends on external services (OSRM/ORS)
- ⚠️ Can fail due to network/API issues
- ⚠️ Limited accuracy for tracking purposes

🔴 STRAIGHT LINE FALLBACK:
- ❌ Shows direct line between points
- ❌ Ignores roads, buildings, obstacles
- ❌ Very poor accuracy for tracking
- ❌ Only useful as last resort
- ❌ Does not represent actual route
  `);
};
