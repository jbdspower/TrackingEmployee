import { LocationData } from "@shared/api";

interface RouteResponse {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  source?: "gps" | "road-api" | "straight-line"; // Track data source
  confidence?: "high" | "medium" | "low"; // Confidence in route accuracy
}

class RoutingService {
  private static instance: RoutingService;
  private cache = new Map<string, { route: RouteResponse; timestamp: number }>();
  private readonly maxCacheSize = 200; // Increased cache size
  private readonly cacheTimeout = 60 * 60 * 1000; // 1 hour for better performance

  static getInstance(): RoutingService {
    if (!RoutingService.instance) {
      RoutingService.instance = new RoutingService();
    }
    return RoutingService.instance;
  }

  private getCacheKey(start: LocationData, end: LocationData): string {
    return `${start.lat.toFixed(5)},${start.lng.toFixed(5)}_${end.lat.toFixed(5)},${end.lng.toFixed(5)}`;
  }

  private isValidCache(cacheEntry: { route: RouteResponse; timestamp: number }): boolean {
    return Date.now() - cacheEntry.timestamp < this.cacheTimeout;
  }

  private async getRouteFromORS(
    start: LocationData,
    end: LocationData,
  ): Promise<RouteResponse | null> {
    try {
      // Get API key from environment or use public demo key
      const apiKey =
        import.meta.env.VITE_OPENROUTESERVICE_API_KEY ||
        "5b3ce3597851110001cf6248832b9ed5a5b1493aa5424ef5b14ebefb";

      const url = `https://api.openrouteservice.org/v2/directions/driving-car`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept:
            "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [start.lng, start.lat],
            [end.lng, end.lat],
          ],
          format: "geojson",
        }),
      });

      if (!response.ok) {
        throw new Error(`ORS API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const route = data.features[0];
        const coordinates = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]],
        );

        return {
          coordinates,
          distance: route.properties.segments[0].distance || 0,
          duration: route.properties.segments[0].duration || 0,
          source: "road-api",
          confidence: "high",
        };
      }
    } catch (error) {
      console.warn("ORS routing failed:", error);
    }
    return null;
  }

  private async getRouteFromOSRM(
    start: LocationData,
    end: LocationData,
  ): Promise<RouteResponse | null> {
    try {
      // Using public OSRM demo server (more reliable for basic routing)
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]],
        );

        return {
          coordinates,
          distance: route.distance || 0,
          duration: route.duration || 0,
          source: "road-api",
          confidence: "high",
        };
      }
    } catch (error) {
      console.warn("OSRM routing failed:", error);
    }
    return null;
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

  private createStraightLineRoute(
    start: LocationData,
    end: LocationData,
  ): RouteResponse {
    // Enhanced straight line with intermediate points for smoother visualization
    const distance = this.calculateStraightLineDistance(start, end);

    // For longer distances, add intermediate points for smoother curves
    const coordinates: [number, number][] = [];

    if (distance > 500) {
      // Add intermediate points for long distances
      const numIntermediatePoints = Math.min(5, Math.floor(distance / 200));
      for (let i = 0; i <= numIntermediatePoints; i++) {
        const ratio = i / numIntermediatePoints;
        const lat = start.lat + (end.lat - start.lat) * ratio;
        const lng = start.lng + (end.lng - start.lng) * ratio;
        coordinates.push([lat, lng]);
      }
    } else {
      // Simple two-point line for short distances
      coordinates.push([start.lat, start.lng], [end.lat, end.lng]);
    }

    return {
      coordinates,
      distance,
      duration: distance / 13.89, // Assume ~50 km/h average speed
      source: "straight-line",
      confidence: distance < 100 ? "medium" : "low",
    };
  }

  async getRoute(
    start: LocationData,
    end: LocationData,
  ): Promise<RouteResponse> {
    const cacheKey = this.getCacheKey(start, end);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      return cached.route;
    }

    // Calculate straight-line distance to determine if routing is worth it
    const straightLineDistance = this.calculateStraightLineDistance(start, end);

    // For very short distances (<50m), don't bother with routing APIs
    if (straightLineDistance < 50) {
      console.log(`Short distance (${Math.round(straightLineDistance)}m), using direct line`);
      const route = this.createStraightLineRoute(start, end);
      route.confidence = "high"; // Short distances are accurate
      return route;
    }

    // Try routing services in order of preference with better error handling
    let route = await this.getRouteFromOSRM(start, end);

    if (!route) {
      route = await this.getRouteFromORS(start, end);
    }

    if (!route) {
      console.warn(
        `⚠️ All road routing services failed for ${Math.round(straightLineDistance)}m distance - using straight line fallback`,
      );
      route = this.createStraightLineRoute(start, end);
      // For longer distances, mark as low confidence
      if (straightLineDistance > 500) {
        route.confidence = "low";
      }
    }

    // Cache the result
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, { route, timestamp: Date.now() });

    return route;
  }

  /**
   * Get GPS-based route from actual tracking points
   * This should be preferred over road routing when actual GPS data is available
   */
  createGPSRoute(gpsPoints: LocationData[]): RouteResponse {
    if (gpsPoints.length < 2) {
      return {
        coordinates: [],
        distance: 0,
        duration: 0,
        source: "gps",
        confidence: "high",
      };
    }

    // Clean and filter GPS points to remove noise
    const cleanedPoints = this.cleanGPSPoints(gpsPoints);

    const coordinates: [number, number][] = cleanedPoints.map((point) => [
      point.lat,
      point.lng,
    ]);

    // Calculate total distance from GPS points
    let totalDistance = 0;
    for (let i = 1; i < cleanedPoints.length; i++) {
      const prev = cleanedPoints[i - 1];
      const curr = cleanedPoints[i];
      totalDistance += this.calculateStraightLineDistance(prev, curr);
    }

    // Calculate duration based on timestamps if available
    let duration = 0;
    if (cleanedPoints[0].timestamp && cleanedPoints[cleanedPoints.length - 1].timestamp) {
      const startTime = new Date(cleanedPoints[0].timestamp).getTime();
      const endTime = new Date(
        cleanedPoints[cleanedPoints.length - 1].timestamp,
      ).getTime();
      duration = (endTime - startTime) / 1000; // Convert to seconds
    } else {
      // Fallback: estimate duration based on distance
      duration = totalDistance / 13.89; // Assume ~50 km/h average speed
    }

    // Determine confidence based on GPS quality
    const confidence = this.assessGPSQuality(cleanedPoints, gpsPoints.length);

    console.log(
      `📍 GPS route: ${cleanedPoints.length}/${gpsPoints.length} points, ${(totalDistance / 1000).toFixed(2)}km, ${confidence} confidence`,
    );

    return {
      coordinates,
      distance: totalDistance,
      duration,
      source: "gps",
      confidence,
    };
  }

  /**
   * Clean GPS points by removing obvious outliers and duplicates
   */
  private cleanGPSPoints(points: LocationData[]): LocationData[] {
    if (points.length <= 2) return points;

    const cleaned: LocationData[] = [points[0]]; // Always keep first point

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = cleaned[cleaned.length - 1];

      // Calculate distance and time from previous point
      const distance = this.calculateStraightLineDistance(previous, current);

      // Skip points that are too close (< 5m) to reduce noise
      if (distance < 5) {
        continue;
      }

      // Skip points that seem unrealistic (> 200m in 10 seconds = 72 km/h)
      if (current.timestamp && previous.timestamp) {
        const timeDiff = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000;
        if (timeDiff > 0 && timeDiff < 10 && distance > 200) {
          console.warn(`Skipping GPS outlier: ${Math.round(distance)}m in ${timeDiff}s`);
          continue;
        }
      }

      cleaned.push(current);
    }

    return cleaned.length >= 2 ? cleaned : points; // Fallback to original if too much filtering
  }

  /**
   * Assess the quality of GPS tracking based on point density and consistency
   */
  private assessGPSQuality(cleanedPoints: LocationData[], originalCount: number): "high" | "medium" | "low" {
    const pointDensityRatio = cleanedPoints.length / originalCount;

    if (cleanedPoints.length >= 10 && pointDensityRatio > 0.7) {
      return "high";
    } else if (cleanedPoints.length >= 5 && pointDensityRatio > 0.5) {
      return "medium";
    } else {
      return "low";
    }
  }

  async getRouteForPoints(points: LocationData[]): Promise<{
    coordinates: [number, number][];
    totalDistance: number;
    segments: RouteResponse[];
    source?: string;
    confidence?: string;
  }> {
    if (points.length < 2) {
      return { coordinates: [], totalDistance: 0, segments: [] };
    }

    const segments: RouteResponse[] = [];
    let allCoordinates: [number, number][] = [];
    let totalDistance = 0;
    let roadSegmentCount = 0;

    // Process points in batches to avoid overwhelming the API
    const maxSegments = 15; // Limit to prevent too many API calls
    const actualPoints = points.length > maxSegments + 1
      ? this.selectKeyPoints(points, maxSegments)
      : points;

    console.log(`Processing route with ${actualPoints.length} key points (from ${points.length} total GPS points)`);

    // Get routes between consecutive points with better error handling
    for (let i = 0; i < actualPoints.length - 1; i++) {
      try {
        const segment = await this.getRoute(actualPoints[i], actualPoints[i + 1]);
        segments.push(segment);

        // Track road-based segments
        if (segment.source === 'road-api') {
          roadSegmentCount++;
        }

        // Add coordinates, avoiding duplicates at connection points
        if (i === 0) {
          allCoordinates.push(...segment.coordinates);
        } else {
          // Skip first coordinate of segment to avoid duplicate
          allCoordinates.push(...segment.coordinates.slice(1));
        }

        totalDistance += segment.distance;
      } catch (error) {
        console.warn(`Failed to get route for segment ${i}-${i+1}:`, error);
        // Add straight line as fallback
        const start = actualPoints[i];
        const end = actualPoints[i + 1];
        const fallbackCoords: [number, number][] = [[start.lat, start.lng], [end.lat, end.lng]];

        if (i === 0) {
          allCoordinates.push(...fallbackCoords);
        } else {
          allCoordinates.push(fallbackCoords[1]); // Skip duplicate start point
        }

        const fallbackDistance = this.calculateStraightLineDistance(start, end);
        totalDistance += fallbackDistance;
      }
    }

    // Determine overall route quality
    const roadSegmentRatio = segments.length > 0 ? roadSegmentCount / segments.length : 0;
    let overallSource = "mixed";
    let overallConfidence = "medium";

    if (roadSegmentRatio >= 0.8) {
      overallSource = "road-api";
      overallConfidence = "high";
    } else if (roadSegmentRatio >= 0.5) {
      overallSource = "road-mixed";
      overallConfidence = "medium";
    } else {
      overallSource = "gps-fallback";
      overallConfidence = "low";
    }

    console.log(`Route complete: ${allCoordinates.length} coordinates, ${Math.round(totalDistance/1000*100)/100}km, ${roadSegmentCount}/${segments.length} road segments`);

    return {
      coordinates: allCoordinates,
      totalDistance,
      segments,
      source: overallSource,
      confidence: overallConfidence,
    };
  }

  /**
   * Select key points from a large GPS route to reduce API calls
   * while preserving the route shape
   */
  private selectKeyPoints(points: LocationData[], maxPoints: number): LocationData[] {
    if (points.length <= maxPoints) {
      return points;
    }

    const keyPoints: LocationData[] = [points[0]]; // Always include start

    // Use a simplified Douglas-Peucker-like algorithm to select important points
    const interval = Math.floor(points.length / (maxPoints - 2));

    for (let i = interval; i < points.length - 1; i += interval) {
      keyPoints.push(points[i]);
    }

    keyPoints.push(points[points.length - 1]); // Always include end

    return keyPoints;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const routingService = RoutingService.getInstance();
