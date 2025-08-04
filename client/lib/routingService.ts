import { LocationData } from "@shared/api";

interface RouteResponse {
  coordinates: [number, number][];
  distance: number;
  duration: number;
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
          duration: route.properties.segments[0].duration || 0
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
          duration: route.duration || 0
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

    return {
      coordinates,
      distance,
      duration: distance / 13.89 // Assume ~50 km/h average speed
    };
  }

  async getRoute(start: LocationData, end: LocationData): Promise<RouteResponse> {
    const cacheKey = this.getCacheKey(start, end);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(Date.now())) {
      return cached;
    }

    // Try routing services in order of preference
    let route = await this.getRouteFromOSRM(start, end);
    
    if (!route) {
      route = await this.getRouteFromORS(start, end);
    }
    
    if (!route) {
      console.warn('All routing services failed, falling back to straight line');
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

  async getRouteForPoints(points: LocationData[]): Promise<{
    coordinates: [number, number][];
    totalDistance: number;
    segments: RouteResponse[];
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
      segments
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const routingService = RoutingService.getInstance();
