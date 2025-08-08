import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Employee, LocationData, TrackingSession } from "@shared/api";
import { routingService } from "@/lib/routingService";

// Fix for default markers in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface EmployeeMapProps {
  employees: Employee[];
  selectedEmployee?: string | null;
  height?: string;
  onEmployeeClick?: (employeeId: string) => void;
  trackingSession?: TrackingSession | null;
  showRoute?: boolean;
}

export function EmployeeMap({
  employees,
  selectedEmployee,
  height = "400px",
  onEmployeeClick,
  trackingSession,
  showRoute = false,
}: EmployeeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    type: string;
    confidence: string;
    points: number;
  } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView(
      [40.7128, -74.006],
      12,
    );

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    // Add Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
    document.head.appendChild(link);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !employees.length) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = {};

    // Create custom icons for different statuses
    const createIcon = (status: Employee["status"]) => {
      const color =
        status === "active"
          ? "#22c55e"
          : status === "meeting"
            ? "#f59e0b"
            : "#6b7280";

      return L.divIcon({
        html: `
          <div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ${selectedEmployee ? (selectedEmployee === employees.find((emp) => emp.location.lat === parseFloat(status) && emp.location.lng === parseFloat(status))?.id ? "transform: scale(1.3);" : "") : ""}
          "></div>
        `,
        className: "custom-div-icon",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
    };

    // Add markers for each employee
    const bounds = L.latLngBounds([]);
    employees.forEach((employee) => {
      if (employee.location.lat && employee.location.lng) {
        const marker = L.marker(
          [employee.location.lat, employee.location.lng],
          { icon: createIcon(employee.status) },
        ).addTo(mapRef.current!);

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${employee.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666;">
              <span style="
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                background-color: ${employee.status === "active" ? "#22c55e" : employee.status === "meeting" ? "#f59e0b" : "#6b7280"};
                color: white;
              ">${employee.status === "active" ? "On Route" : employee.status === "meeting" ? "In Meeting" : "Offline"}</span>
            </p>
            <p style="margin: 0 0 4px 0; font-size: 14px;">${employee.location.address}</p>
            ${employee.currentTask ? `<p style="margin: 0 0 4px 0; font-size: 12px; font-style: italic;">${employee.currentTask}</p>` : ""}
            <p style="margin: 0; font-size: 12px; color: #888;">Updated ${employee.lastUpdate}</p>
          </div>
        `);

        if (onEmployeeClick) {
          marker.on("click", () => onEmployeeClick(employee.id));
        }

        markersRef.current[employee.id] = marker;
        bounds.extend([employee.location.lat, employee.location.lng]);
      }
    });

    // Fit map to show all markers
    if (employees.length > 0 && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [employees, selectedEmployee, onEmployeeClick]);

  // Handle route visualization with intelligent road-based routing
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing route
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    routeMarkersRef.current.forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    routeMarkersRef.current = [];

    if (!showRoute || !trackingSession || !trackingSession.route.length) {
      setRouteError(null);
      setRouteInfo(null);
      return;
    }

    const route = trackingSession.route;

    // Enhanced route display with road-based routing for better visualization
    const displayEnhancedRoute = async () => {
      if (route.length < 2) {
        setRouteError("Not enough points for route visualization");
        setRouteInfo(null);
        return;
      }

      setIsLoadingRoute(true);
      setRouteError(null);

      try {
        if (!mapRef.current) return;

        let finalCoordinates: L.LatLngExpression[] = [];
        let routeSource = "gps";
        let routeConfidence = "high";

        // Strategy 1: If we have good GPS density (many points), use GPS with road snapping
        if (route.length >= 8) {
          console.log("Using enhanced GPS route with road intelligence");

          // Group nearby points to reduce API calls and improve performance
          const keyPoints = [route[0]]; // Always include start
          for (let i = 1; i < route.length - 1; i++) {
            const prev = keyPoints[keyPoints.length - 1];
            const curr = route[i];

            // Calculate distance from last key point
            const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);

            // Add point if it's far enough away (>100m) or represents significant direction change
            if (distance > 100) {
              keyPoints.push(curr);
            }
          }
          keyPoints.push(route[route.length - 1]); // Always include end

          // Try to get road-based route for key segments
          try {
            const segments = [];
            for (let i = 0; i < keyPoints.length - 1; i++) {
              const segment = await routingService.getRoute(keyPoints[i], keyPoints[i + 1]);
              if (segment.source === 'road-api') {
                segments.push(...segment.coordinates);
              } else {
                // Fallback to straight line for this segment
                segments.push([keyPoints[i].lat, keyPoints[i].lng], [keyPoints[i + 1].lat, keyPoints[i + 1].lng]);
              }
            }

            if (segments.length > 0) {
              finalCoordinates = segments;
              routeSource = "road-enhanced";
              routeConfidence = "high";
            } else {
              throw new Error("Road routing failed");
            }
          } catch (roadError) {
            console.warn("Road-based routing failed, using smoothed GPS:", roadError);
            finalCoordinates = route.map(point => [point.lat, point.lng]);
            routeSource = "gps-smoothed";
            routeConfidence = "medium";
          }
        }
        // Strategy 2: If we have fewer GPS points, try to get full road route
        else if (route.length >= 2) {
          console.log("Using road-based routing for sparse GPS data");

          try {
            const roadRoute = await routingService.getRouteForPoints(route.slice(0, Math.min(route.length, 5)));
            if (roadRoute.coordinates.length > 0 && roadRoute.source === 'road-api') {
              finalCoordinates = roadRoute.coordinates;
              routeSource = "road-api";
              routeConfidence = "high";
            } else {
              throw new Error("Road API unavailable");
            }
          } catch (roadError) {
            console.warn("Road routing API failed, using GPS points:", roadError);
            finalCoordinates = route.map(point => [point.lat, point.lng]);
            routeSource = "gps";
            routeConfidence = "low";
          }
        }

        // Determine visual styling based on route quality
        const getRouteStyle = () => {
          switch (routeSource) {
            case "road-api":
            case "road-enhanced":
              return {
                color: "#1e40af", // Blue for road-based routes
                weight: 5,
                opacity: 0.8,
                dashArray: undefined
              };
            case "gps-smoothed":
              return {
                color: "#059669", // Green for smoothed GPS
                weight: 4,
                opacity: 0.7,
                dashArray: undefined
              };
            default:
              return {
                color: "#dc2626", // Red for basic GPS
                weight: 3,
                opacity: 0.6,
                dashArray: "10, 5" // Dashed line to indicate lower accuracy
              };
          }
        };

        const style = getRouteStyle();

        // Create enhanced polyline with better styling
        routeLayerRef.current = L.polyline(finalCoordinates, {
          ...style,
          smoothFactor: routeSource.includes('road') ? 0.5 : 0.2,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapRef.current);

        // Add route shadow for better visibility
        const shadowRoute = L.polyline(finalCoordinates, {
          color: "#000000",
          weight: style.weight + 2,
          opacity: 0.3,
          smoothFactor: style.smoothFactor,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapRef.current);

        // Insert shadow behind main route
        shadowRoute.bringToBack();

        // Set enhanced route info
        const getRouteInfo = () => {
          switch (routeSource) {
            case "road-api":
              return { type: "Road Network", confidence: "High Accuracy", points: finalCoordinates.length };
            case "road-enhanced":
              return { type: "GPS + Road Intelligence", confidence: "High Accuracy", points: finalCoordinates.length };
            case "gps-smoothed":
              return { type: "Smoothed GPS", confidence: "Medium Accuracy", points: route.length };
            default:
              return { type: "GPS Tracking", confidence: "Basic Accuracy", points: route.length };
          }
        };

        setRouteInfo(getRouteInfo());

        console.log(
          `🗺️ Displaying ${routeSource} route with ${finalCoordinates.length} coordinates (${routeConfidence} confidence)`,
        );

        // Fit map to show the route with appropriate padding
        const routeBounds = L.latLngBounds(finalCoordinates);
        mapRef.current.fitBounds(routeBounds, { padding: [30, 30] });

      } catch (error) {
        console.error("Error displaying enhanced route:", error);
        setRouteError("Failed to display route");
        setRouteInfo(null);

        // Fallback: show basic GPS route
        try {
          const basicCoords = route.map(point => [point.lat, point.lng]);
          routeLayerRef.current = L.polyline(basicCoords, {
            color: "#dc2626",
            weight: 3,
            opacity: 0.6,
            dashArray: "5, 5",
            smoothFactor: 0.1,
          }).addTo(mapRef.current!);

          setRouteInfo({ type: "Basic GPS", confidence: "Limited", points: route.length });
        } catch (fallbackError) {
          console.error("Even fallback route failed:", fallbackError);
        }
      } finally {
        setIsLoadingRoute(false);
      }
    };

    // Helper function to calculate distance between two points
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng1 - lng2) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    displayEnhancedRoute();

    // Add start marker
    if (trackingSession.startLocation) {
      const startIcon = L.divIcon({
        html: `
          <div style="
            background-color: #22c55e;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            color: white;
          ">S</div>
        `,
        className: "custom-div-icon",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const startMarker = L.marker(
        [trackingSession.startLocation.lat, trackingSession.startLocation.lng],
        { icon: startIcon },
      ).addTo(mapRef.current);

      startMarker.bindPopup(`
        <div style="min-width: 150px;">
          <h4 style="margin: 0 0 8px 0; color: #22c55e;">Route Start</h4>
          <p style="margin: 0 0 4px 0; font-size: 12px;">
            ${new Date(trackingSession.startTime).toLocaleString()}
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            ${trackingSession.startLocation.address}
          </p>
        </div>
      `);

      routeMarkersRef.current.push(startMarker);
    }

    // Add end marker if tracking is completed
    if (trackingSession.endLocation && trackingSession.status === "completed") {
      const endIcon = L.divIcon({
        html: `
          <div style="
            background-color: #ef4444;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            color: white;
          ">E</div>
        `,
        className: "custom-div-icon",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const endMarker = L.marker(
        [trackingSession.endLocation.lat, trackingSession.endLocation.lng],
        { icon: endIcon },
      ).addTo(mapRef.current);

      endMarker.bindPopup(`
        <div style="min-width: 150px;">
          <h4 style="margin: 0 0 8px 0; color: #ef4444;">Route End</h4>
          <p style="margin: 0 0 4px 0; font-size: 12px;">
            ${trackingSession.endTime ? new Date(trackingSession.endTime).toLocaleString() : "In progress"}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
            ${trackingSession.endLocation.address}
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            Distance: ${(trackingSession.totalDistance / 1000).toFixed(2)} km
          </p>
        </div>
      `);

      routeMarkersRef.current.push(endMarker);
    }

    // Add selective waypoint markers for important GPS points
    if (route.length > 2) {
      // Only show waypoints for longer routes to avoid clutter
      const waypointInterval = Math.max(1, Math.floor(route.length / 5)); // Show ~5 waypoints max

      route.forEach((point, index) => {
        if (index > 0 && index < route.length - 1 && index % waypointInterval === 0) {
          const waypointIcon = L.divIcon({
            html: `
              <div style="
                background-color: #3b82f6;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                opacity: 0.9;
              "></div>
            `,
            className: "custom-div-icon",
            iconSize: [8, 8],
            iconAnchor: [4, 4],
          });

          const waypointMarker = L.marker([point.lat, point.lng], {
            icon: waypointIcon,
          }).addTo(mapRef.current);

          waypointMarker.bindPopup(`
            <div style="min-width: 160px;">
              <h4 style="margin: 0 0 8px 0; color: #3b82f6;">Route Point</h4>
              <p style="margin: 0 0 4px 0; font-size: 12px;">
                <strong>Time:</strong> ${new Date(point.timestamp).toLocaleTimeString()}
              </p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #666;">
                Position: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
              </p>
              <p style="margin: 0; font-size: 11px; color: #666;">
                Point ${index + 1} of ${route.length}
              </p>
            </div>
          `);

          routeMarkersRef.current.push(waypointMarker);
        }
      });
    }
  }, [showRoute, trackingSession]);

  // Center map on selected employee
  useEffect(() => {
    if (!mapRef.current || !selectedEmployee) return;

    const employee = employees.find((emp) => emp.id === selectedEmployee);
    if (employee && employee.location.lat && employee.location.lng) {
      mapRef.current.setView(
        [employee.location.lat, employee.location.lng],
        15,
      );
    }
  }, [selectedEmployee, employees]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        style={{ height, width: "100%", borderRadius: "8px" }}
        className="relative z-0"
      />

      {/* Loading indicator */}
      {isLoadingRoute && (
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border border-border rounded-md px-3 py-2 text-sm flex items-center space-x-2 z-10">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Generating route...</span>
        </div>
      )}

      {/* Enhanced route information indicator */}
      {showRoute && routeInfo && (
        <div
          className={`absolute top-2 right-2 backdrop-blur-sm border rounded-md px-3 py-2 text-sm z-10 ${
            routeInfo.confidence === "High Accuracy"
              ? "bg-blue-500/90 border-blue-500 text-white"
              : routeInfo.confidence === "Medium Accuracy"
                ? "bg-green-500/90 border-green-500 text-white"
                : routeInfo.confidence === "Basic Accuracy"
                  ? "bg-orange-500/90 border-orange-500 text-white"
                  : "bg-red-500/90 border-red-500 text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <span>
              {routeInfo.type.includes('Road') ? '🛣️' : routeInfo.type.includes('GPS + Road') ? '🗺️' : '📍'} {routeInfo.type}
            </span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            {routeInfo.confidence} • {routeInfo.points} {routeInfo.points === 1 ? 'point' : 'points'}
          </div>
          {routeInfo.type.includes('Road') && (
            <div className="text-xs mt-1 opacity-75">
              🎯 Road-optimized route
            </div>
          )}
        </div>
      )}

      {/* Enhanced route error indicator */}
      {routeError && (
        <div className="absolute top-2 left-2 bg-destructive/90 backdrop-blur-sm border border-destructive rounded-md px-3 py-2 text-sm text-destructive-foreground z-10">
          <div className="flex items-center space-x-2">
            <span>⚠️ Route Display Issue</span>
          </div>
          <div className="text-xs mt-1">{routeError}</div>
          <div className="text-xs mt-1 opacity-80">
            💡 Route will improve with more GPS points
          </div>
        </div>
      )}
    </div>
  );
}
