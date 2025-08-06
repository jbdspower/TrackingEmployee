import { LocationData } from "@shared/api";

interface RouteResponse {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  source?: 'gps' | 'road-api' | 'straight-line'; // Track data source
  confidence?: 'high' | 'medium' | 'low'; // Confidence in route accuracy
}

class RoutingService {
  private static instance: RoutingService;
  private cache = new Map<string, RouteResponse>();
  private readonly maxCacheSize = 100;
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes

  static getInstance(): RoutingService {
    if (!RoutingService.instance) {
      RoutingService.instance = new RoutingService();
    }
    return RoutingService.instance;
  }

  private getCacheKey(start: LocationData, end: LocationData): string {
    return `${start.lat.toFixed(5)},${start.lng.toFixed(5)}_${end.lat.toFixed(5)},${end.lng.toFixed(5)}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private async getRouteFromORS(start: LocationData, end: LocationData): Promise<RouteResponse | null> {
    try {
      // Get API key from environment or use public demo key
      const apiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY || '5b3ce3597851110001cf6248832b9ed5a5b1493aa5424ef5b14ebefb';

      const url = `https://api.openrouteservice.org/v2/directions/driving-car`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          'Content-Type': 'application/json',
          'Authorization': apiKey,
        },
        body: JSON.stringify({
          coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
          format: 'geojson'
        })
      });

      if (!response.ok) {
        throw new Error(`ORS API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const route = data.features[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        
        return {
          coordinates,
          distance: route.properties.segments[0].distance || 0,
          duration: route.properties.segments[0].duration || 0,
          source: 'road-api',
          confidence: 'high'
        };
      }
    } catch (error) {
      console.warn('ORS routing failed:', error);
    }
    return null;
  }

  private async getRouteFromOSRM(start: LocationData, end: LocationData): Promise<RouteResponse | null> {
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
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        
        return {
          coordinates,
          distance: route.distance || 0,
          duration: route.duration || 0,
          source: 'road-api',
          confidence: 'high'
        };
      }
    } catch (error) {
      console.warn('OSRM routing failed:', error);
    }
    return null;
  }

  private createStraightLineRoute(start: LocationData, end: LocationData): RouteResponse {
    // Fallback to straight line if routing services fail
    const coordinates: [number, number][] = [[start.lat, start.lng], [end.lat, end.lng]];

    // Simple distance calculation (Haversine)
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (start.lat * Math.PI) / 180;
    const φ2 = (end.lat * Math.PI) / 180;
    const Δφ = ((end.lat - start.lat) * Math.PI) / 180;
    const Δλ = ((start.lng - end.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    console.warn('Using straight-line route - routing APIs failed');
    return {
      coordinates,
      distance,
      duration: distance / 13.89, // Assume ~50 km/h average speed
      source: 'straight-line',
      confidence: 'low'
    };
  }

  async getRoute(start: LocationData, end: LocationData): Promise<RouteResponse> {
    const cacheKey = this.getCacheKey(start, end);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(Date.now())) {
      return cached;
    }

    // Try routing services in order of preference with better error handling
    let route = await this.getRouteFromOSRM(start, end);

    if (!route) {
      route = await this.getRouteFromORS(start, end);
    }

    if (!route) {
      console.warn('⚠️ All road routing services failed - using straight line fallback');
      console.warn('This may not represent the actual route taken by the employee');
      route = this.createStraightLineRoute(start, end);
    }

    // Cache the result
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, route);
    
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
        source: 'gps',
        confidence: 'high'
      };
    }

    const coordinates: [number, number][] = gpsPoints.map(point => [point.lat, point.lng]);

    // Calculate total distance from GPS points
    let totalDistance = 0;
    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];

      const R = 6371e3; // Earth's radius in meters
      const φ1 = (prev.lat * Math.PI) / 180;
      const φ2 = (curr.lat * Math.PI) / 180;
      const Δφ = ((curr.lat - prev.lat) * Math.PI) / 180;
      const Δλ = ((prev.lng - curr.lng) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }

    // Calculate duration based on timestamps if available
    let duration = 0;
    if (gpsPoints[0].timestamp && gpsPoints[gpsPoints.length - 1].timestamp) {
      const startTime = new Date(gpsPoints[0].timestamp).getTime();
      const endTime = new Date(gpsPoints[gpsPoints.length - 1].timestamp).getTime();
      duration = (endTime - startTime) / 1000; // Convert to seconds
    } else {
      // Fallback: estimate duration based on distance
      duration = totalDistance / 13.89; // Assume ~50 km/h average speed
    }

    console.log(`📍 Using GPS route with ${gpsPoints.length} points, distance: ${(totalDistance/1000).toFixed(2)}km`);
    return {
      coordinates,
      distance: totalDistance,
      duration,
      source: 'gps',
      confidence: 'high'
    };
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

    // Get routes between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const segment = await this.getRoute(points[i], points[i + 1]);
      segments.push(segment);
      
      // Add coordinates, avoiding duplicates at connection points
      if (i === 0) {
        allCoordinates.push(...segment.coordinates);
      } else {
        // Skip first coordinate of segment to avoid duplicate
        allCoordinates.push(...segment.coordinates.slice(1));
      }
      
      totalDistance += segment.distance;
    }

    return {
      coordinates: allCoordinates,
      totalDistance,
      segments,
      source: segments.length > 0 ? segments[0].source : 'unknown',
      confidence: segments.length > 0 ? segments[0].confidence : 'unknown'
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const routingService = RoutingService.getInstance();
