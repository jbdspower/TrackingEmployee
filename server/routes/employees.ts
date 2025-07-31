import { RequestHandler } from "express";
import axios from 'axios';
import {
  Employee,
  ExternalUser,
  EmployeesResponse,
  LocationUpdate,
  LocationUpdateResponse,
} from "@shared/api";
import { Employee as EmployeeModel, IEmployee, TrackingSession } from "../models";

// Configuration
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCACHE_TTL = 60 * 60 * 1000; // 1 hour cache TTL

// Types
interface EmployeeStatus {
  status: "active" | "inactive" | "meeting";
  location: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  lastUpdate: string;
  currentTask?: string;
}

interface GeocodeCacheItem {
  address: string;
  expires: number;
}

// State
let employeeStatuses: Record<string, EmployeeStatus> = {};
const geocodeCache = new Map<string, { address: string; expires: number }>();

// Utility Functions
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";

  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.address;
  }

  try {
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'FieldTracker/1.0 (contact@yourdomain.com)'
      },
      timeout: 5000
    });

    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    geocodeCache.set(cacheKey, {
      address,
      expires: Date.now() + GEOCACHE_TTL
    });

    return address;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Replace your getAddressFromCoordinates function with this:
async function getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";

  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  
  // Return cached address if available and not expired
  if (cached && cached.expires > Date.now()) {
    return cached.address;
  }

  try {
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'YourAppName/1.0 (your@email.com)' // Required by Nominatim
      },
      timeout: 5000
    });

    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Cache the result
    geocodeCache.set(cacheKey, {
      address,
      expires: Date.now() + GEOCACHE_TTL
    });

    return address;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

async function getEmployeeLatestLocation(employeeId: string) {
  try {
    // First try Employee model
    const employee = await EmployeeModel.findOne({ id: employeeId }).lean();
    if (employee?.location?.lat && employee.location.lng !== 0) {
      const address = employee.location.address?.includes(',') 
        ? await getAddressFromCoordinates(employee.location.lat, employee.location.lng)
        : employee.location.address || await getAddressFromCoordinates(employee.location.lat, employee.location.lng);
      
      return {
        lat: employee.location.lat,
        lng: employee.location.lng,
        address,
        timestamp: employee.location.timestamp,
        lastUpdate: employee.lastUpdate || "Recently updated"
      };
    }

    // Fallback to tracking sessions
    const latestSession = await TrackingSession.findOne({
      employeeId,
      $or: [{ status: 'active' }, { status: 'completed' }]
    }).sort({ startTime: -1 }).lean();

    if (latestSession) {
      const latestLocation = latestSession.route?.length 
        ? latestSession.route[latestSession.route.length - 1]
        : latestSession.startLocation;

      if (latestLocation.lat !== 0 && latestLocation.lng !== 0) {
        const address = latestLocation.address?.includes(',')
          ? await getAddressFromCoordinates(latestLocation.lat, latestLocation.lng)
          : latestLocation.address || await getAddressFromCoordinates(latestLocation.lat, latestLocation.lng);
        
        return {
          lat: latestLocation.lat,
          lng: latestLocation.lng,
          address,
          timestamp: latestLocation.timestamp,
          lastUpdate: latestSession.status === 'active' 
            ? "Currently tracking" 
            : "From last session"
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Location lookup failed for ${employeeId}:`, error);
    return null;
  }
}

export const clearGeocodeCache: RequestHandler = async (req, res) => {
  try {
    geocodeCache.clear();
    res.json({ success: true, message: "Geocode cache cleared" });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
};

async function fetchExternalUsers(): Promise<ExternalUser[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(EXTERNAL_API_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("External API fetch failed:", error);
    return [];
  }
}

async function mapExternalUserToEmployee(user: ExternalUser, index: number): Promise<Employee> {
  const userId = user._id;
  const realLocation = await getEmployeeLatestLocation(userId);

  // Initialize or update status
  if (!employeeStatuses[userId]) {
    employeeStatuses[userId] = {
      status: index === 1 ? "meeting" : index === 3 ? "inactive" : "active",
      location: realLocation || {
        lat: 0,
        lng: 0,
        address: "Location not available",
        timestamp: new Date().toISOString()
      },
      lastUpdate: realLocation?.lastUpdate || "Location not tracked",
      currentTask: index === 0 ? "Client meeting" : index === 1 ? "Equipment installation" : undefined
    };
  } else if (realLocation) {
    employeeStatuses[userId].location = {
      lat: realLocation.lat,
      lng: realLocation.lng,
      address: realLocation.address,
      timestamp: realLocation.timestamp
    };
    employeeStatuses[userId].lastUpdate = realLocation.lastUpdate;
  }

  const status = employeeStatuses[userId];

  return {
    id: userId,
    name: user.name,
    email: user.email,
    phone: user.mobileNumber,
    status: status.status,
    location: status.location,
    lastUpdate: status.lastUpdate,
    currentTask: status.currentTask,
    deviceId: `device_${userId.slice(-6)}`,
    designation: user.designation,
    department: user.department,
    companyName: user.companyName[0]?.companyName,
    reportTo: user.report?.name
  };
}

// API Handlers
export const getEmployees: RequestHandler = async (req, res) => {
  try {
    if (req.query.clearCache === 'true') {
      employeeStatuses = {};
      geocodeCache.clear();
    }

    const externalUsers = await fetchExternalUsers();
    if (externalUsers.length > 0) {
      const employees = await Promise.all(
        externalUsers.map((user, index) => mapExternalUserToEmployee(user, index))
      );

      // Sync to MongoDB
      try {
        await Promise.all(employees.map(employee => 
          EmployeeModel.findOneAndUpdate(
            { id: employee.id },
            employee,
            { upsert: true, new: true }
          )
        ));
      } catch (dbError) {
        console.warn("MongoDB sync failed:", dbError);
      }

      return res.json({ employees, total: employees.length });
    }

    // Fallback to MongoDB
    try {
      const mongoEmployees = await EmployeeModel.find({}).lean();
      return res.json({ employees: mongoEmployees, total: mongoEmployees.length });
    } catch (dbError) {
      console.warn("MongoDB fallback failed:", dbError);
      return res.json({ employees: [], total: 0 });
    }
  } catch (error) {
    console.error("Employee fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const getEmployee: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const externalUsers = await fetchExternalUsers();
    
    if (externalUsers.length > 0) {
      const user = externalUsers.find(u => u._id === id);
      if (user) {
        const employee = await mapExternalUserToEmployee(user, externalUsers.indexOf(user));
        
        try {
          await EmployeeModel.findOneAndUpdate(
            { id },
            employee,
            { upsert: true, new: true }
          );
        } catch (dbError) {
          console.warn("MongoDB update failed:", dbError);
        }
        
        return res.json(employee);
      }
    }

    // Fallback to MongoDB
    try {
      const employee = await EmployeeModel.findOne({ id }).lean();
      if (employee) return res.json(employee);
    } catch (dbError) {
      console.warn("MongoDB query failed:", dbError);
    }

    return res.status(404).json({ error: "Employee not found" });
  } catch (error) {
    console.error("Employee fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};

export const updateEmployeeLocation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    // Get human-readable address
    const address = await getAddressFromCoordinates(lat, lng);
    
    const locationUpdate = {
      location: {
        lat,
        lng,
        address, // Now contains human-readable address
        timestamp: new Date().toISOString()
      },
      lastUpdate: "Just now",
      status: "active"
    };

    // Rest of your existing implementation...
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { id },
        { $set: locationUpdate },
        { new: true }
      );

      if (updatedEmployee) {
        return res.json({ success: true, employee: updatedEmployee });
      }
    } catch (dbError) {
      console.warn("MongoDB update failed:", dbError);
    }

    // Fallback to in-memory
    const externalUsers = await fetchExternalUsers();
    const userIndex = externalUsers.findIndex(user => user._id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    employeeStatuses[id] = employeeStatuses[id]
      ? { ...employeeStatuses[id], ...locationUpdate }
      : { ...locationUpdate, status: "active" as const, currentTask: undefined };

    const employee = await mapExternalUserToEmployee(externalUsers[userIndex], userIndex);
    res.json({ success: true, employee });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};

export const updateEmployeeStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentTask } = req.body;
    const update = { status, currentTask, lastUpdate: "Just now" };

    try {
      const employee = await EmployeeModel.findOneAndUpdate(
        { id },
        { $set: update },
        { new: true }
      );
      
      if (employee) return res.json(employee);
    } catch (dbError) {
      console.warn("MongoDB update failed:", dbError);
    }

    // Fallback to in-memory
    const externalUsers = await fetchExternalUsers();
    const user = externalUsers.find(u => u._id === id);
    
    if (!user) return res.status(404).json({ error: "Employee not found" });

    if (!employeeStatuses[id]) {
      const location = await getEmployeeLatestLocation(id);
      employeeStatuses[id] = {
        status: "active",
        location: location || {
          lat: 0,
          lng: 0,
          address: "Location not available",
          timestamp: new Date().toISOString()
        },
        lastUpdate: location?.lastUpdate || "Location not tracked"
      };
    }

    employeeStatuses[id] = { ...employeeStatuses[id], ...update };
    const employee = await mapExternalUserToEmployee(user, externalUsers.indexOf(user));
    res.json(employee);
  } catch (error) {
    console.error("Status update failed:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const clearLocationCache: RequestHandler = async (req, res) => {
  try {
    employeeStatuses = {};
    geocodeCache.clear();
    res.json({ success: true, message: "Cache cleared successfully" });
  } catch (error) {
    console.error("Cache clear failed:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
};

export const refreshEmployeeLocations: RequestHandler = async (req, res) => {
  try {
    employeeStatuses = {};
    const externalUsers = await fetchExternalUsers();
    const employees = await Promise.all(
      externalUsers.map((user, index) => mapExternalUserToEmployee(user, index))
    );

    try {
      await Promise.all(employees.map(employee =>
        EmployeeModel.findOneAndUpdate(
          { id: employee.id },
          employee,
          { upsert: true, new: true }
        )
      ));
    } catch (dbError) {
      console.warn("MongoDB sync failed:", dbError);
    }

    res.json({
      success: true,
      message: `Refreshed ${employees.length} employees`,
      employees
    });
  } catch (error) {
    console.error("Refresh failed:", error);
    res.status(500).json({ error: "Failed to refresh locations" });
  }
};

// Placeholder handlers
export const createEmployee: RequestHandler = (req, res) => 
  res.status(501).json({ error: "Use external API for creation" });

export const updateEmployee: RequestHandler = (req, res) => 
  res.status(501).json({ error: "Use external API for updates" });

export const deleteEmployee: RequestHandler = (req, res) => 
  res.status(501).json({ error: "Use external API for deletion" });
