import { RequestHandler } from "express";
import {
  Employee,
  ExternalUser,
  EmployeesResponse,
  LocationUpdate,
  LocationUpdateResponse,
} from "@shared/api";
import { Employee as EmployeeModel, IEmployee, TrackingSession } from "../models";

// External API URL
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";

// In-memory storage for employee statuses and locations (since external API doesn't provide these)
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

let employeeStatuses: Record<string, EmployeeStatus> = {};

// Real coordinate-based address formatting (no hardcoded cities)
function getAddressFromCoordinates(lat: number, lng: number): string {
  // Return precise coordinates without mapping to hardcoded cities
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Removed hardcoded city mapping - now using real coordinates only

// No default location - employees without tracking data will show "Location not available"

// Function to get the latest real location for an employee
async function getEmployeeLatestLocation(employeeId: string) {
  try {
    console.log(`Looking up real location data for employee ${employeeId}...`);

    // First, try to get the latest location from the Employee model (most recent update)
    const employee = await EmployeeModel.findOne({ id: employeeId }).lean();
    if (employee && employee.location && employee.location.lat && employee.location.lng &&
        employee.location.lat !== 0 && employee.location.lng !== 0) {
      console.log(`✓ Found stored location for employee ${employeeId}: ${employee.location.lat}, ${employee.location.lng}`);
      return {
        lat: employee.location.lat,
        lng: employee.location.lng,
        address: employee.location.address || `${employee.location.lat.toFixed(6)}, ${employee.location.lng.toFixed(6)}`,
        timestamp: employee.location.timestamp,
        lastUpdate: employee.lastUpdate || "Recently updated"
      };
    }

    // Fallback: Try to get the latest location from tracking sessions
    const latestSession = await TrackingSession.findOne({
      employeeId,
      $or: [
        { status: 'active' },
        { status: 'completed' }
      ]
    })
    .sort({ startTime: -1 })
    .lean();

    if (latestSession) {
      // Use the latest route point if available, otherwise use start location
      const latestLocation = latestSession.route && latestSession.route.length > 0
        ? latestSession.route[latestSession.route.length - 1]
        : latestSession.startLocation;

      if (latestLocation.lat !== 0 && latestLocation.lng !== 0) {
        console.log(`✓ Found tracking session location for employee ${employeeId}: ${latestLocation.lat}, ${latestLocation.lng}`);
        return {
          lat: latestLocation.lat,
          lng: latestLocation.lng,
          address: latestLocation.address || `${latestLocation.lat.toFixed(6)}, ${latestLocation.lng.toFixed(6)}`,
          timestamp: latestLocation.timestamp,
          lastUpdate: latestSession.status === 'active' ? "Currently tracking" : "From last session"
        };
      }
    }

    console.log(`✗ No real location found for employee ${employeeId} - employee will show as location unavailable`);
    return null;
  } catch (error) {
    console.error(`Error fetching location for employee ${employeeId}:`, error);
    return null;
  }
}

// Function to map external user to internal employee structure
async function mapExternalUserToEmployee(
  user: ExternalUser,
  index: number,
): Promise<Employee> {
  const userId = user._id;

  // Try to get real location data first
  const realLocation = await getEmployeeLatestLocation(userId);

  // Initialize or update status
  if (!employeeStatuses[userId]) {
    employeeStatuses[userId] = {
      status: index === 1 ? "meeting" : index === 3 ? "inactive" : "active",
      location: realLocation || {
        lat: 0,
        lng: 0,
        address: "Location not available",
        timestamp: new Date().toISOString(),
      },
      lastUpdate: realLocation?.lastUpdate || "Location not tracked",
      currentTask:
        index === 0
          ? "Client meeting"
          : index === 1
            ? "Equipment installation"
            : undefined,
    };
  } else {
    // Update with real location if available
    if (realLocation) {
      employeeStatuses[userId].location = {
        lat: realLocation.lat,
        lng: realLocation.lng,
        address: realLocation.address,
        timestamp: realLocation.timestamp,
      };
      employeeStatuses[userId].lastUpdate = realLocation.lastUpdate;
    }
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
    reportTo: user.report?.name,
  };
}

// Function to fetch users from external API
async function fetchExternalUsers(): Promise<ExternalUser[]> {
  try {
    console.log("Fetching users from external API:", EXTERNAL_API_URL);

    // Add timeout to external API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(EXTERNAL_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Employee-Tracker/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`,
      );
    }

    const users = (await response.json()) as ExternalUser[];
    console.log("External API response:", {
      count: users.length,
      sample: users[0],
    });
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Error fetching external users:", error);

    // Check if it's a timeout or abort error
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("External API request timed out after 30 seconds");
      } else if (error.message.includes("fetch")) {
        console.error("Network error connecting to external API");
      }
    }

    // Return empty array if API fails
    return [];
  }
}

export const getEmployees: RequestHandler = async (req, res) => {
  try {
    // Clear any cached hardcoded locations on each request to ensure fresh real data
    const clearCache = req.query.clearCache === 'true';
    if (clearCache) {
      employeeStatuses = {};
      console.log("Cache cleared - will fetch fresh real location data for all employees");
    }

    // Try to fetch from external API and sync with MongoDB
    const externalUsers = await fetchExternalUsers();

    if (externalUsers.length > 0) {
      console.log(`Mapping ${externalUsers.length} employees with real location data...`);
      const employees = await Promise.all(
        externalUsers.map((user, index) =>
          mapExternalUserToEmployee(user, index)
        )
      );

      // Count employees with real vs default locations
      const realLocationCount = employees.filter(emp =>
        emp.location.address !== "Location not available"
      ).length;
      console.log(`${realLocationCount}/${employees.length} employees have real location data`);

      // Try to sync with MongoDB (upsert)
      try {
        const syncPromises = employees.map(async (employee) => {
          await EmployeeModel.findOneAndUpdate(
            { id: employee.id },
            employee,
            {
              upsert: true,
              new: true,
              runValidators: true
            }
          );
        });
        await Promise.all(syncPromises);
        console.log(`Synced ${employees.length} employees with real location data to MongoDB`);
      } catch (dbError) {
        console.warn("Failed to sync employees to MongoDB:", dbError);
      }

      const response: EmployeesResponse = {
        employees,
        total: employees.length,
      };
      res.json(response);
      return;
    }

    // Fallback to MongoDB if external API fails
    try {
      console.log("External API failed, falling back to MongoDB");
      const mongoEmployees = await EmployeeModel.find({}).lean();

      const response: EmployeesResponse = {
        employees: mongoEmployees,
        total: mongoEmployees.length,
      };

      console.log(`Found ${mongoEmployees.length} employees in MongoDB`);
      res.json(response);
      return;
    } catch (dbError) {
      console.warn("MongoDB fallback failed:", dbError);
    }

    // Final fallback - empty response
    const response: EmployeesResponse = {
      employees: [],
      total: 0,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const getEmployee: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Try external API first
    const externalUsers = await fetchExternalUsers();
    if (externalUsers.length > 0) {
      const userIndex = externalUsers.findIndex((user) => user._id === id);

      if (userIndex !== -1) {
        const employee = await mapExternalUserToEmployee(
          externalUsers[userIndex],
          userIndex,
        );

        // Try to sync this employee to MongoDB
        try {
          await EmployeeModel.findOneAndUpdate(
            { id: employee.id },
            employee,
            {
              upsert: true,
              new: true,
              runValidators: true
            }
          );
        } catch (dbError) {
          console.warn("Failed to sync employee to MongoDB:", dbError);
        }

        res.json(employee);
        return;
      }
    }

    // Fallback to MongoDB
    try {
      const mongoEmployee = await EmployeeModel.findOne({ id }).lean();
      if (mongoEmployee) {
        console.log("Employee found in MongoDB:", mongoEmployee.id);
        res.json(mongoEmployee);
        return;
      }
    } catch (dbError) {
      console.warn("MongoDB query failed:", dbError);
    }

    return res.status(404).json({ error: "Employee not found" });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};

export const updateEmployeeLocation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, accuracy } = req.body;

    // Get formatted address from coordinates
    const address = getAddressFromCoordinates(lat, lng);
    console.log(`Generated address: ${address}`);

    const locationUpdate = {
      location: {
        lat,
        lng,
        address,
        timestamp: new Date().toISOString(),
      },
      lastUpdate: "Just now",
      status: "active", // Update status to active when location is updated
    };

    // Try to update in MongoDB first
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { id },
        { $set: locationUpdate },
        { new: true, runValidators: true }
      );

      if (updatedEmployee) {
        console.log("Employee location updated in MongoDB:", updatedEmployee.id);
        const response: LocationUpdateResponse = {
          success: true,
          employee: updatedEmployee,
        };
        res.json(response);
        return;
      }
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to external API:", dbError);
    }

    // Fallback to external API + in-memory
    const externalUsers = await fetchExternalUsers();
    const userIndex = externalUsers.findIndex((user) => user._id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Update local status
    if (!employeeStatuses[id]) {
      employeeStatuses[id] = {
        status: "active",
        location: { lat, lng, address, timestamp: new Date().toISOString() },
        lastUpdate: "Just now",
      };
    } else {
      employeeStatuses[id] = {
        ...employeeStatuses[id],
        ...locationUpdate,
      };
    }

    const employee = await mapExternalUserToEmployee(
      externalUsers[userIndex],
      userIndex,
    );

    const response: LocationUpdateResponse = {
      success: true,
      employee,
    };

    console.log("Employee location updated in memory:", employee.id);
    res.json(response);
  } catch (error) {
    console.error("Error updating employee location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};

export const updateEmployeeStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentTask } = req.body;

    const statusUpdate = {
      status,
      currentTask: currentTask || undefined,
      lastUpdate: "Just now",
    };

    // Try to update in MongoDB first
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { id },
        { $set: statusUpdate },
        { new: true, runValidators: true }
      );

      if (updatedEmployee) {
        console.log("Employee status updated in MongoDB:", updatedEmployee.id);
        res.json(updatedEmployee);
        return;
      }
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to external API:", dbError);
    }

    // Fallback to external API + in-memory
    const externalUsers = await fetchExternalUsers();
    const userIndex = externalUsers.findIndex((user) => user._id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Update local status
    if (!employeeStatuses[id]) {
      const realLocation = await getEmployeeLatestLocation(id);
      employeeStatuses[id] = {
        status: "active",
        location: realLocation || {
          lat: 0,
          lng: 0,
          address: "Location not available",
          timestamp: new Date().toISOString(),
        },
        lastUpdate: realLocation?.lastUpdate || "Location not tracked",
      };
    }

    employeeStatuses[id] = {
      ...employeeStatuses[id],
      ...statusUpdate,
    };

    const employee = await mapExternalUserToEmployee(
      externalUsers[userIndex],
      userIndex,
    );

    console.log("Employee status updated in memory:", employee.id);
    res.json(employee);
  } catch (error) {
    console.error("Error updating employee status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const createEmployee: RequestHandler = (req, res) => {
  // Since we're using external API, employee creation should be handled there
  res
    .status(501)
    .json({ error: "Employee creation should be handled by the external API" });
};

export const updateEmployee: RequestHandler = (req, res) => {
  // Since we're using external API, employee updates should be handled there
  res
    .status(501)
    .json({ error: "Employee updates should be handled by the external API" });
};

export const deleteEmployee: RequestHandler = (req, res) => {
  // Since we're using external API, employee deletion should be handled there
  res
    .status(501)
    .json({ error: "Employee deletion should be handled by the external API" });
};

export const clearLocationCache: RequestHandler = async (req, res) => {
  try {
    // Clear all cached location data
    employeeStatuses = {};
    console.log("Employee location cache cleared - next request will fetch fresh real location data");

    res.json({
      success: true,
      message: "Location cache cleared successfully. Next employee fetch will use fresh real location data.",
    });
  } catch (error) {
    console.error("Error clearing location cache:", error);
    res.status(500).json({ error: "Failed to clear location cache" });
  }
};

export const refreshEmployeeLocations: RequestHandler = async (req, res) => {
  try {
    console.log("Refreshing all employee locations with real tracking data");

    // Clear existing location statuses to remove any hardcoded data
    employeeStatuses = {};
    console.log("Cleared all cached employee statuses to force real location lookup");

    // Get fresh data from external API
    const externalUsers = await fetchExternalUsers();

    // Re-initialize with real locations
    const employees = await Promise.all(
      externalUsers.map((user, index) =>
        mapExternalUserToEmployee(user, index)
      )
    );

    // Try to sync all employees to MongoDB
    try {
      const syncPromises = employees.map(async (employee) => {
        await EmployeeModel.findOneAndUpdate(
          { id: employee.id },
          employee,
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );
      });
      await Promise.all(syncPromises);
      console.log(`Synced ${employees.length} refreshed employees to MongoDB`);
    } catch (dbError) {
      console.warn("Failed to sync refreshed employees to MongoDB:", dbError);
    }

    console.log(`Refreshed locations for ${employees.length} employees`);

    res.json({
      success: true,
      message: `Successfully refreshed locations for ${employees.length} employees with real tracking data`,
      employees,
    });
  } catch (error) {
    console.error("Error refreshing employee locations:", error);
    res.status(500).json({ error: "Failed to refresh employee locations" });
  }
};
