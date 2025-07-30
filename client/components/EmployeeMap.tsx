import { useEffect, useRef } from "react";
import L from "leaflet";
import { Employee, LocationData, TrackingSession } from "@shared/api";

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

  // Handle route visualization
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing route
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    routeMarkersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    routeMarkersRef.current = [];

    if (!showRoute || !trackingSession || !trackingSession.route.length) return;

    const route = trackingSession.route;

    // Create polyline for the route
    const routeCoords: L.LatLngExpression[] = route.map(point => [point.lat, point.lng]);

    routeLayerRef.current = L.polyline(routeCoords, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      dashArray: '5, 10'
    }).addTo(mapRef.current);

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
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const startMarker = L.marker(
        [trackingSession.startLocation.lat, trackingSession.startLocation.lng],
        { icon: startIcon }
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
    if (trackingSession.endLocation && trackingSession.status === 'completed') {
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
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const endMarker = L.marker(
        [trackingSession.endLocation.lat, trackingSession.endLocation.lng],
        { icon: endIcon }
      ).addTo(mapRef.current);

      endMarker.bindPopup(`
        <div style="min-width: 150px;">
          <h4 style="margin: 0 0 8px 0; color: #ef4444;">Route End</h4>
          <p style="margin: 0 0 4px 0; font-size: 12px;">
            ${trackingSession.endTime ? new Date(trackingSession.endTime).toLocaleString() : 'In progress'}
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

    // Add waypoint markers for intermediate points (every 5th point to avoid clutter)
    route.forEach((point, index) => {
      if (index > 0 && index < route.length - 1 && index % 5 === 0) {
        const waypointIcon = L.divIcon({
          html: `
            <div style="
              background-color: #6b7280;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            "></div>
          `,
          className: 'custom-div-icon',
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });

        const waypointMarker = L.marker(
          [point.lat, point.lng],
          { icon: waypointIcon }
        ).addTo(mapRef.current);

        waypointMarker.bindPopup(`
          <div style="min-width: 120px;">
            <h4 style="margin: 0 0 8px 0; color: #6b7280;">Waypoint</h4>
            <p style="margin: 0; font-size: 12px;">
              ${new Date(point.timestamp).toLocaleTimeString()}
            </p>
          </div>
        `);

        routeMarkersRef.current.push(waypointMarker);
      }
    });

    // Fit map to show the route
    if (routeCoords.length > 0) {
      const routeBounds = L.latLngBounds(routeCoords);
      mapRef.current.fitBounds(routeBounds, { padding: [30, 30] });
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
    <div
      ref={mapContainerRef}
      style={{ height, width: "100%", borderRadius: "8px" }}
      className="relative z-0"
    />
  );
}
