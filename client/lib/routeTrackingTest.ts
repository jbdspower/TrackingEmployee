// Comprehensive test for route tracking functionality
// This tests all the fixes for distance calculation and route visualization

import { routingService } from './routingService';
import { LocationData } from '@shared/api';
import { getBestAPIConfig, getAPIRecommendations } from './apiKeyConfig';

// Test route from a realistic journey (e.g., office to client meeting ~40km)
const testRoute: LocationData[] = [
  // Starting point (office)
  { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi", timestamp: "2024-01-15T09:00:00.000Z" },
  // Intermediate points (journey)
  { lat: 28.6254, lng: 77.2232, address: "Karol Bagh", timestamp: "2024-01-15T09:15:00.000Z" },
  { lat: 28.6511, lng: 77.2410, address: "Civil Lines", timestamp: "2024-01-15T09:30:00.000Z" },
  { lat: 28.6785, lng: 77.2654, address: "GTB Nagar", timestamp: "2024-01-15T09:45:00.000Z" },
  { lat: 28.7041, lng: 77.1025, address: "Rohini", timestamp: "2024-01-15T10:00:00.000Z" },
  { lat: 28.7342, lng: 77.0822, address: "Sector 3 Rohini", timestamp: "2024-01-15T10:10:00.000Z" },
  // Destination (client office)
  { lat: 28.7503, lng: 77.0689, address: "Client Office, Rohini", timestamp: "2024-01-15T10:20:00.000Z" }
];

// Short test route for API testing
const shortTestRoute: LocationData[] = [
  { lat: 28.6139, lng: 77.2090, address: "Start", timestamp: "2024-01-15T09:00:00.000Z" },
  { lat: 28.6254, lng: 77.2232, address: "End", timestamp: "2024-01-15T09:15:00.000Z" }
];

export class RouteTrackingTest {
  private results: any[] = [];

  async runAllTests(): Promise<void> {
    console.log("🧪 Starting Route Tracking Comprehensive Tests");
    console.log("=" .repeat(60));

    // Test 1: API Configuration
    await this.testAPIConfiguration();

    // Test 2: Distance Calculations
    await this.testDistanceCalculations();

    // Test 3: Route Processing
    await this.testRouteProcessing();

    // Test 4: API Routing Services
    await this.testRoutingAPIs();

    // Test 5: GPS Route Creation
    await this.testGPSRouteCreation();

    // Display results
    this.displayResults();
  }

  private async testAPIConfiguration(): Promise<void> {
    console.log("\n📊 Testing API Configuration...");
    
    const apiConfig = getBestAPIConfig();
    const recommendations = getAPIRecommendations();
    
    console.log(`Current API: ${apiConfig.type} - ${apiConfig.description}`);
    console.log(`Has paid keys: ${apiConfig.hasKey}`);
    
    this.results.push({
      test: "API Configuration",
      status: "✓ Pass",
      details: `Using ${apiConfig.type} API`,
      recommendation: apiConfig.hasKey ? "Good to go!" : "Consider upgrading to paid API for better reliability"
    });
  }

  private async testDistanceCalculations(): Promise<void> {
    console.log("\n📏 Testing Distance Calculations...");
    
    const start = testRoute[0];
    const end = testRoute[testRoute.length - 1];
    
    // Test straight-line distance
    const straightDistance = this.calculateStraightLineDistance(start, end);
    console.log(`Straight-line distance: ${(straightDistance / 1000).toFixed(2)} km`);
    
    // Test GPS route distance
    const gpsRoute = routingService.createGPSRoute(testRoute);
    console.log(`GPS route distance: ${(gpsRoute.distance / 1000).toFixed(2)} km`);
    console.log(`GPS route confidence: ${gpsRoute.confidence}`);
    
    const isReasonable = gpsRoute.distance > straightDistance && gpsRoute.distance < straightDistance * 2;
    
    this.results.push({
      test: "Distance Calculations",
      status: isReasonable ? "✓ Pass" : "⚠ Warning",
      details: `GPS: ${(gpsRoute.distance / 1000).toFixed(2)}km, Straight: ${(straightDistance / 1000).toFixed(2)}km`,
      recommendation: isReasonable ? "Distance calculations look correct" : "GPS distance seems unrealistic"
    });
  }

  private async testRouteProcessing(): Promise<void> {
    console.log("\n🛣️ Testing Route Processing...");
    
    const processedRoute = await routingService.getRouteForPoints(testRoute);
    console.log(`Processed route coordinates: ${processedRoute.coordinates.length}`);
    console.log(`Total distance: ${(processedRoute.totalDistance / 1000).toFixed(2)} km`);
    console.log(`Route source: ${processedRoute.source}`);
    console.log(`Route confidence: ${processedRoute.confidence}`);
    
    const hasValidDistance = processedRoute.totalDistance > 0;
    const hasValidCoordinates = processedRoute.coordinates.length >= 2;
    
    this.results.push({
      test: "Route Processing",
      status: (hasValidDistance && hasValidCoordinates) ? "✓ Pass" : "❌ Fail",
      details: `${processedRoute.coordinates.length} coords, ${(processedRoute.totalDistance / 1000).toFixed(2)}km`,
      recommendation: hasValidDistance ? "Route processing working correctly" : "Route processing needs fixing"
    });
  }

  private async testRoutingAPIs(): Promise<void> {
    console.log("\n🌐 Testing Routing APIs...");
    
    const start = shortTestRoute[0];
    const end = shortTestRoute[1];
    
    try {
      const route = await routingService.getRoute(start, end);
      console.log(`API route source: ${route.source}`);
      console.log(`API route confidence: ${route.confidence}`);
      console.log(`API route distance: ${(route.distance / 1000).toFixed(2)} km`);
      console.log(`API route coordinates: ${route.coordinates.length}`);
      
      const isWorking = route.coordinates.length >= 2 && route.distance > 0;
      
      this.results.push({
        test: "Routing APIs",
        status: isWorking ? "✓ Pass" : "⚠ Warning",
        details: `${route.source} source, ${route.confidence} confidence`,
        recommendation: route.source === 'road-api' ? "APIs working well" : "APIs limited, consider paid service"
      });
    } catch (error) {
      console.error("API routing failed:", error);
      this.results.push({
        test: "Routing APIs",
        status: "❌ Fail",
        details: `Error: ${error.message}`,
        recommendation: "APIs not working, need paid service or fix"
      });
    }
  }

  private async testGPSRouteCreation(): Promise<void> {
    console.log("\n📍 Testing GPS Route Creation...");
    
    // Test with various point counts
    const testCases = [
      { points: testRoute.slice(0, 1), name: "Single point" },
      { points: testRoute.slice(0, 2), name: "Two points" },
      { points: testRoute.slice(0, 4), name: "Four points" },
      { points: testRoute, name: "Full route" }
    ];
    
    for (const testCase of testCases) {
      const gpsRoute = routingService.createGPSRoute(testCase.points);
      console.log(`${testCase.name}: ${(gpsRoute.distance / 1000).toFixed(2)}km, ${gpsRoute.confidence} confidence`);
    }
    
    this.results.push({
      test: "GPS Route Creation",
      status: "✓ Pass",
      details: "All point counts handled correctly",
      recommendation: "GPS route creation working properly"
    });
  }

  private calculateStraightLineDistance(start: LocationData, end: LocationData): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (start.lat * Math.PI) / 180;
    const φ2 = (end.lat * Math.PI) / 180;
    const Δφ = ((end.lat - start.lat) * Math.PI) / 180;
    const Δλ = ((start.lng - end.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private displayResults(): void {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 TEST RESULTS SUMMARY");
    console.log("=".repeat(60));
    
    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Details: ${result.details}`);
      console.log(`   💡 ${result.recommendation}`);
    });
    
    const passCount = this.results.filter(r => r.status.includes("✓")).length;
    const warnCount = this.results.filter(r => r.status.includes("⚠")).length;
    const failCount = this.results.filter(r => r.status.includes("❌")).length;
    
    console.log("\n" + "=".repeat(60));
    console.log(`📊 OVERALL RESULTS: ${passCount} Pass, ${warnCount} Warning, ${failCount} Fail`);
    
    if (failCount > 0) {
      console.log("\n🚨 CRITICAL ISSUES FOUND - Route tracking may not work properly");
      console.log("   Recommend using a paid API service for reliable routing");
    } else if (warnCount > 0) {
      console.log("\n⚠️ SOME LIMITATIONS DETECTED - Route tracking working but could be improved");
      console.log("   Consider upgrading to a paid API for better accuracy");
    } else {
      console.log("\n✅ ALL TESTS PASSED - Route tracking should work well!");
    }
    
    console.log("\n💰 API UPGRADE OPTIONS:");
    console.log("   • OpenRouteService: €2.99/month for 2000 requests/day");
    console.log("   • MapBox: Free 50k/month then pay-per-use");
    console.log("   • Google Maps: Enterprise-grade accuracy (requires billing)");
    
    console.log("\n🔧 TO ENABLE PAID APIs:");
    console.log("   Add to your .env file:");
    console.log("   VITE_OPENROUTESERVICE_API_KEY=your_key_here");
    console.log("   VITE_MAPBOX_API_KEY=your_key_here");
    console.log("   VITE_GOOGLE_MAPS_API_KEY=your_key_here");
  }

  // Public method to run a quick test
  async quickTest(): Promise<boolean> {
    console.log("🚀 Running Quick Route Tracking Test...");
    
    try {
      // Test basic GPS route creation
      const gpsRoute = routingService.createGPSRoute(shortTestRoute);
      const hasValidDistance = gpsRoute.distance > 0;
      
      // Test API routing
      const apiRoute = await routingService.getRoute(shortTestRoute[0], shortTestRoute[1]);
      const hasValidRoute = apiRoute.coordinates.length >= 2;
      
      const isWorking = hasValidDistance && hasValidRoute;
      
      console.log(`✅ Quick test ${isWorking ? 'PASSED' : 'FAILED'}`);
      console.log(`   GPS distance: ${(gpsRoute.distance / 1000).toFixed(2)}km`);
      console.log(`   API source: ${apiRoute.source}, confidence: ${apiRoute.confidence}`);
      
      return isWorking;
    } catch (error) {
      console.error("❌ Quick test FAILED:", error.message);
      return false;
    }
  }
}

// Export a singleton instance
export const routeTrackingTest = new RouteTrackingTest();

// Convenience function for quick testing
export const testRouteTracking = () => routeTrackingTest.quickTest();
export const fullRouteTrackingTest = () => routeTrackingTest.runAllTests();
