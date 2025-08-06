import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Employee } from "@shared/api";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface EmployeeMapProps {
  employees: Employee[];
  selectedEmployee?: Employee | null;
  height?: string;
  onEmployeeClick?: (employee: Employee) => void;
  center?: [number, number];
  zoom?: number;
}

// Component to handle map centering when selectedEmployee changes
function MapController({
  employees,
  selectedEmployee,
  center,
}: {
  employees: Employee[];
  selectedEmployee?: Employee | null;
  center?: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedEmployee?.location?.lat && selectedEmployee?.location?.lng) {
      map.setView(
        [selectedEmployee.location.lat, selectedEmployee.location.lng],
        15,
      );
    } else if (center) {
      map.setView(center, 10);
    } else if (employees.length > 0) {
      // Center on all employees
      const bounds = L.latLngBounds(
        employees
          .filter((emp) => emp.location?.lat && emp.location?.lng)
          .map((emp) => [emp.location!.lat, emp.location!.lng]),
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, selectedEmployee, employees, center]);

  return null;
}

// Custom marker icons based on employee status
const createCustomIcon = (status: string, isSelected: boolean = false) => {
  let color = "#3b82f6"; // default blue

  switch (status) {
    case "active":
    case "on_route":
      color = "#10b981"; // green
      break;
    case "meeting":
    case "in_meeting":
      color = "#f59e0b"; // yellow/orange
      break;
    case "inactive":
    case "offline":
      color = "#6b7280"; // gray
      break;
    default:
      color = "#3b82f6"; // blue
  }

  const size = isSelected ? 30 : 20;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${isSelected ? "3px" : "2px"} solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ${isSelected ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);" : ""}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export function EmployeeMap({
  employees,
  selectedEmployee,
  height = "400px",
  onEmployeeClick,
  center,
  zoom = 10,
}: EmployeeMapProps) {
  const mapRef = useRef<L.Map>(null);

  // Default center if not provided
  const defaultCenter: [number, number] = center || [20.5937, 78.9629]; // Center of India

  // Defensive check for employees array
  const safeEmployees = Array.isArray(employees) ? employees : [];

  // Filter employees with valid locations
  const employeesWithLocation = safeEmployees.filter(
    (emp) =>
      emp?.location?.lat &&
      emp?.location?.lng &&
      emp.location.lat !== 0 &&
      emp.location.lng !== 0,
  );

  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          employees={employeesWithLocation}
          selectedEmployee={selectedEmployee}
          center={center}
        />

        {employeesWithLocation.map((employee) => {
          const isSelected = selectedEmployee?._id === employee._id;
          const position: [number, number] = [
            employee.location!.lat,
            employee.location!.lng,
          ];

          return (
            <Marker
              key={employee._id}
              position={position}
              icon={createCustomIcon(employee.status || "inactive", isSelected)}
              eventHandlers={{
                click: () => {
                  if (onEmployeeClick) {
                    onEmployeeClick(employee);
                  }
                },
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-lg mb-2">
                    {employee.name}
                  </h3>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.status === "active"
                            ? "bg-green-100 text-green-700"
                            : employee.status === "meeting"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {employee.status || "Unknown"}
                      </span>
                    </div>

                    {employee.designation && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span>{employee.designation}</span>
                      </div>
                    )}

                    {employee.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="text-xs">{employee.phone}</span>
                      </div>
                    )}

                    {employee.location?.address && (
                      <div className="mt-2">
                        <span className="text-gray-600 text-xs">Location:</span>
                        <p className="text-xs text-gray-800 mt-1 leading-relaxed">
                          {employee.location.address}
                        </p>
                      </div>
                    )}

                    {employee.lastSeen && (
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                        <span>Last seen:</span>
                        <span>
                          {new Date(employee.lastSeen).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {employeesWithLocation.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📍</div>
            <p>No employee locations available</p>
            <p className="text-sm">
              Locations will appear when employees start tracking
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
