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

    // Simplified and more reliable route display
    const displayEnhancedRoute = async () => {
      if (route.length < 1) {
        setRouteError("No GPS points available for route visualization");
        setRouteInfo(null);
        return;
      }

      setIsLoadingRoute(true);
      setRouteError(null);

      try {
        if (!mapRef.current) return;

        let finalCoordinates: L.LatLngExpression[] = [];
        let routeSource = "gps";
        let routeConfidence = "medium";

        console.log(`Displaying route with ${route.length} GPS points`);

        // For single point, just show the point
        if (route.length === 1) {
          finalCoordinates = [[route[0].lat, route[0].lng]];
          routeSource = "single-point";
          routeConfidence = "high";
        }
        // For multiple points, try to enhance with road routing but don't fail if it doesn't work
        else {
          // Always start with GPS coordinates as fallback
          finalCoordinates = route.map(point => [point.lat, point.lng]);
          routeSource = "gps-points";
          routeConfidence = route.length >= 5 ? "medium" : "basic";

          // Try to enhance with road routing only if we have reasonable number of points
          if (route.length >= 2 && route.length <= 10) {
            try {
              console.log("Attempting road-based route enhancement...");

              // For short routes (2-3 points), try direct routing
              if (route.length <= 3) {
                const roadRoute = await routingService.getRoute(route[0], route[route.length - 1]);
                if (roadRoute.source === 'road-api' && roadRoute.coordinates.length > 0) {
                  finalCoordinates = roadRoute.coordinates;
                  routeSource = "road-direct";
                  routeConfidence = "high";
                  console.log("Successfully enhanced route with direct road routing");
                }
              }
              // For longer routes, use the GPS points but try to validate total distance
              else {
                const routeData = await routingService.createGPSRoute(route);
                if (routeData.coordinates.length > 0) {
                  finalCoordinates = routeData.coordinates;
                  routeSource = "gps-processed";
                  routeConfidence = routeData.confidence || "medium";
                  console.log(`Successfully processed GPS route: ${routeData.confidence} confidence`);
                }
              }
            } catch (enhancementError) {
              console.warn("Route enhancement failed, using basic GPS points:", enhancementError.message);
              // Already have GPS coordinates as fallback
            }
          }
        }

        // Determine visual styling based on route quality
        const getRouteStyle = () => {
          switch (routeSource) {
            case "road-direct":
            case "road-api":
              return {
                color: "#2563eb", // Blue for road-based routes
                weight: 5,
                opacity: 0.8,
                dashArray: undefined
              };
            case "gps-processed":
              return {
                color: "#16a34a", // Green for processed GPS
                weight: 4,
                opacity: 0.7,
                dashArray: undefined
              };
            case "single-point":
              return {
                color: "#dc2626", // Red for single point
                weight: 6,
                opacity: 0.9,
                dashArray: undefined
              };
            default:
              return {
                color: "#ea580c", // Orange for basic GPS
                weight: 3,
                opacity: 0.6,
                dashArray: "8, 4" // Dashed line to indicate lower accuracy
              };
          }
        };

        const style = getRouteStyle();

        // For single point, create a circle marker instead of polyline
        if (routeSource === "single-point" && finalCoordinates.length === 1) {
          const point = finalCoordinates[0] as L.LatLngExpression;
          routeLayerRef.current = L.circle(point, {
            radius: 50, // 50 meter radius
            color: style.color,
            weight: style.weight,
            opacity: style.opacity,
            fillColor: style.color,
            fillOpacity: 0.3,
          }).addTo(mapRef.current);
        }
        // For multiple points, create polyline
        else if (finalCoordinates.length >= 2) {
          routeLayerRef.current = L.polyline(finalCoordinates, {
            ...style,
            smoothFactor: routeSource.includes('road') ? 0.5 : 0.2,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapRef.current);

          // Add route shadow for better visibility (only for polylines)
          const shadowRoute = L.polyline(finalCoordinates, {
            color: "#000000",
            weight: style.weight + 2,
            opacity: 0.2,
            smoothFactor: routeSource.includes('road') ? 0.5 : 0.2,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapRef.current);

          // Insert shadow behind main route
          shadowRoute.bringToBack();
        }

        // Set route info based on what we actually displayed
        const getRouteInfo = () => {
          switch (routeSource) {
            case "road-direct":
            case "road-api":
              return { type: "Road Network", confidence: "High Accuracy", points: finalCoordinates.length };
            case "gps-processed":
              return { type: "Enhanced GPS", confidence: routeConfidence === "high" ? "High Accuracy" : "Medium Accuracy", points: route.length };
            case "single-point":
              return { type: "Current Location", confidence: "High Accuracy", points: 1 };
            default:
              return { type: "GPS Points", confidence: "Basic Accuracy", points: route.length };
          }
        };

        setRouteInfo(getRouteInfo());

        console.log(
          `🗺️ Displayed ${routeSource} route: ${finalCoordinates.length} coordinates, ${routeConfidence} confidence`,
        );

        // Fit map to show the route with appropriate padding
        if (finalCoordinates.length > 0) {
          if (finalCoordinates.length === 1) {
            // For single point, center on it with reasonable zoom
            mapRef.current.setView(finalCoordinates[0] as L.LatLngExpression, 16);
          } else {
            // For multiple points, fit bounds
            const routeBounds = L.latLngBounds(finalCoordinates);
            mapRef.current.fitBounds(routeBounds, { padding: [30, 30] });
          }
        }

      } catch (error) {
        console.error("Error displaying route:", error);
        setRouteError(`Failed to display route: ${error.message}`);
        setRouteInfo(null);

        // Ultimate fallback: show basic GPS points
        try {
          if (route.length >= 1) {
            const basicCoords = route.map(point => [point.lat, point.lng]);

            if (basicCoords.length === 1) {
              // Single point fallback
              routeLayerRef.current = L.circle(basicCoords[0] as L.LatLngExpression, {
                radius: 30,
                color: "#dc2626",
                weight: 2,
                opacity: 0.7,
                fillColor: "#dc2626",
                fillOpacity: 0.2,
              }).addTo(mapRef.current!);
            } else {
              // Multi-point fallback
              routeLayerRef.current = L.polyline(basicCoords, {
                color: "#dc2626",
                weight: 3,
                opacity: 0.6,
                dashArray: "5, 5",
                smoothFactor: 0.1,
              }).addTo(mapRef.current!);
            }

            setRouteInfo({ type: "Fallback GPS", confidence: "Limited", points: route.length });
            setRouteError(null); // Clear error since we managed to show something

            // Fit map to fallback route
            if (basicCoords.length === 1) {
              mapRef.current!.setView(basicCoords[0] as L.LatLngExpression, 16);
            } else {
              const bounds = L.latLngBounds(basicCoords);
              mapRef.current!.fitBounds(bounds, { padding: [20, 20] });
            }
          }
        } catch (fallbackError) {
          console.error("Even fallback route failed:", fallbackError);
          setRouteError("Unable to display any route visualization");
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
