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
  const [routeInfo, setRouteInfo] = useState<{type: string, confidence: string, points: number} | null>(null);

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

  // Handle route visualization with road-based routing
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

    // Show exact GPS path (the actual route the employee took)
    const displayGPSRoute = () => {
      if (route.length < 2) {
        setRouteError("Not enough points for route visualization");
        setRouteInfo(null);
        return;
      }

      setIsLoadingRoute(false);
      setRouteError(null);

      try {
        if (!mapRef.current) return;

        // Use the exact GPS coordinates captured during tracking
        const gpsCoords: L.LatLngExpression[] = route.map((point) => [
          point.lat,
          point.lng,
        ]);

        // Determine route quality based on point density and tracking session
        const routeQuality = route.length >= 10 ? 'high' : route.length >= 5 ? 'medium' : 'low';
        const routeColor = routeQuality === 'high' ? '#22c55e' : routeQuality === 'medium' ? '#f59e0b' : '#ef4444';

        // Create polyline showing the exact path taken by the employee
        routeLayerRef.current = L.polyline(gpsCoords, {
          color: routeColor, // Color indicates route quality
          weight: 4,
          opacity: 0.9,
          smoothFactor: 0.1, // Minimal smoothing to preserve exact GPS accuracy
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapRef.current);

        // Set route info for user feedback
        setRouteInfo({
          type: 'GPS Tracking',
          confidence: routeQuality === 'high' ? 'High Accuracy' : routeQuality === 'medium' ? 'Medium Accuracy' : 'Low Accuracy',
          points: route.length
        });

        console.log(`📍 Displaying actual GPS path with ${route.length} points (${routeQuality} quality)`);

        // Fit map to show the actual route
        const routeBounds = L.latLngBounds(gpsCoords);
        mapRef.current.fitBounds(routeBounds, { padding: [30, 30] });
      } catch (error) {
        console.error("Error displaying GPS route:", error);
        setRouteError("Failed to display GPS route");
        setRouteInfo(null);
      }
    };

    displayGPSRoute();

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

    // Add waypoint markers for intermediate points (every 3rd point to show more detail)
    route.forEach((point, index) => {
      if (index > 0 && index < route.length - 1 && index % 3 === 0) {
        // Use route quality color for waypoints too
        const waypointColor = route.length >= 10 ? '#22c55e' : route.length >= 5 ? '#f59e0b' : '#ef4444';
        const waypointIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${waypointColor};
              width: 10px;
              height: 10px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.4);
              opacity: 0.8;
            "></div>
          `,
          className: "custom-div-icon",
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const waypointMarker = L.marker([point.lat, point.lng], {
          icon: waypointIcon,
        }).addTo(mapRef.current);

        waypointMarker.bindPopup(`
          <div style="min-width: 140px;">
            <h4 style="margin: 0 0 8px 0; color: #22c55e;">GPS Point</h4>
            <p style="margin: 0 0 4px 0; font-size: 12px;">
              <strong>Time:</strong> ${new Date(point.timestamp).toLocaleTimeString()}
            </p>
            <p style="margin: 0; font-size: 11px; color: #666;">
              Lat: ${point.lat.toFixed(6)}<br>
              Lng: ${point.lng.toFixed(6)}
            </p>
          </div>
        `);

        routeMarkersRef.current.push(waypointMarker);
      }
    });
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

      {/* Route information indicator */}
      {showRoute && routeInfo && (
        <div className={`absolute top-2 right-2 backdrop-blur-sm border rounded-md px-3 py-2 text-sm z-10 ${
          routeInfo.confidence === 'High Accuracy'
            ? 'bg-success/90 border-success text-success-foreground'
            : routeInfo.confidence === 'Medium Accuracy'
            ? 'bg-warning/90 border-warning text-warning-foreground'
            : 'bg-destructive/90 border-destructive text-destructive-foreground'
        }`}>
          <div className="flex items-center space-x-2">
            <span>📍 {routeInfo.type}</span>
          </div>
          <div className="text-xs mt-1">
            {routeInfo.confidence} • {routeInfo.points} points
          </div>
        </div>
      )}

      {/* Route error indicator */}
      {routeError && (
        <div className="absolute top-12 right-2 bg-destructive/90 backdrop-blur-sm border border-destructive rounded-md px-3 py-2 text-sm text-destructive-foreground z-10">
          <div className="flex items-center space-x-2">
            <span>⚠️ Route Error</span>
          </div>
          <div className="text-xs mt-1">{routeError}</div>
          <div className="text-xs mt-1 opacity-80">
            💡 GPS tracking provides the most accurate routes
          </div>
        </div>
      )}
    </div>
  );
}
