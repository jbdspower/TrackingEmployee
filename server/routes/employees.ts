import { RequestHandler } from "express";
import axios from 'axios';
import Database from '../config/database.js';
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
const lastGeocodingRequest = { timestamp: 0 };
const GEOCODING_RATE_LIMIT = 1000; // Minimum 1 second between requests

// In-memory employee storage for fallback
let inMemoryEmployees: Employee[] = [];

// Utility Functions
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";

  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.address;
  }

  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodingRequest.timestamp;
    if (timeSinceLastRequest < GEOCODING_RATE_LIMIT) {
      await new Promise(resolve => setTimeout(resolve, GEOCODING_RATE_LIMIT - timeSinceLastRequest));
    }
    lastGeocodingRequest.timestamp = Date.now();

    const response = await axios.get(NOMINATIM_URL, {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'EmployeeTracker/2.0 (support@company.com)'
      },
      timeout: 8000
    });

    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geocodeCache.set(cacheKey, { address, expires: Date.now() + GEOCACHE_TTL });
    return address;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geocodeCache.set(cacheKey, { address: fallbackAddress, expires: Date.now() + 300000 }); // 5 min cache
    return fallbackAddress;
  }
}

// Enhanced data synchronization
async function syncExternalEmployeeData(): Promise<Employee[]> {
  try {
    console.log('Syncing employee data from external API...');
    
    const response = await axios.get(EXTERNAL_API_URL, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'EmployeeTracker/2.0'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from external API');
    }

    const externalUsers: ExternalUser[] = response.data;
    const employees: Employee[] = externalUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      designation: user.designation || '',
      department: user.department || '',
      location: user.location || {
        lat: 0,
        lng: 0,
        address: 'Location not available',
        timestamp: new Date().toISOString()
      },
      status: 'active',
      lastSeen: new Date().toISOString(),
      trackingSessionId: undefined,
      isActive: true,
    }));

    console.log(`Synced ${employees.length} employees from external API`);
    return employees;
  } catch (error) {
    console.error('External API sync failed:', error);
    throw error;
  }
}

async function syncEmployeeToDatabase(employee: Employee): Promise<void> {
  const db = Database.getInstance();
  
  await db.executeWithFallback(
    async () => {
      await EmployeeModel.findOneAndUpdate(
        { _id: employee._id },
        {
          ...employee,
          updatedAt: new Date().toISOString()
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );
      console.log(`MongoDB sync successful for employee: ${employee._id}`);
    },
    () => {
      const existingIndex = inMemoryEmployees.findIndex(e => e._id === employee._id);
      if (existingIndex >= 0) {
        inMemoryEmployees[existingIndex] = employee;
      } else {
        inMemoryEmployees.push(employee);
      }
      console.log(`Memory sync successful for employee: ${employee._id}`);
    },
    `sync employee ${employee._id}`
  );
}

// Get all employees
export const getEmployees: RequestHandler = async (req, res) => {
  try {
    const db = Database.getInstance();

    // Execute with fallback pattern
    const employees = await db.executeWithFallback(
      async () => {
        console.log('Fetching employees from MongoDB...');
        const dbEmployees = await EmployeeModel.find({}).lean();
        console.log(`Found ${dbEmployees.length} employees in database`);
        return dbEmployees as Employee[];
      },
      () => {
        console.log('MongoDB query failed, falling back to in-memory storage');
        console.log(`Found ${inMemoryEmployees.length} employees in memory`);
        return inMemoryEmployees;
      },
      'fetch employees'
    );

    // If no employees found, try syncing from external API
    if (employees.length === 0) {
      try {
        console.log('No employees found, attempting external sync...');
        const syncedEmployees = await syncExternalEmployeeData();
        
        // Save to database/memory
        for (const employee of syncedEmployees) {
          await syncEmployeeToDatabase(employee);
        }

        const response: EmployeesResponse = {
          employees: syncedEmployees,
          total: syncedEmployees.length,
          synced: true,
          lastSync: new Date().toISOString()
        };

        return res.json(response);
      } catch (syncError) {
        console.error('External sync failed:', syncError);
        // Continue with empty list rather than failing
      }
    }

    // Add current status information
    const employeesWithStatus = employees.map(employee => {
      const status = employeeStatuses[employee._id] || {
        status: 'inactive' as const,
        location: employee.location || {
          lat: 0,
          lng: 0,
          address: 'Location not available',
          timestamp: new Date().toISOString()
        },
        lastUpdate: employee.lastSeen || new Date().toISOString()
      };

      return {
        ...employee,
        location: status.location,
        status: status.status,
        lastSeen: status.lastUpdate,
        currentTask: status.currentTask
      };
    });

    const response: EmployeesResponse = {
      employees: employeesWithStatus,
      total: employeesWithStatus.length,
      synced: false,
      lastSync: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getEmployees:", error);
    
    // Final fallback to in-memory data
    try {
      const response: EmployeesResponse = {
        employees: inMemoryEmployees,
        total: inMemoryEmployees.length,
        synced: false,
        lastSync: new Date().toISOString(),
        error: "Database temporarily unavailable"
      };
      res.json(response);
    } catch (fallbackError) {
      console.error("Complete fallback failed:", fallbackError);
      res.status(500).json({ 
        error: "Failed to fetch employees",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// Get single employee
export const getEmployee: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const db = Database.getInstance();

    if (!id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    // Execute with fallback pattern
    const employee = await db.executeWithFallback(
      async () => {
        console.log('Fetching employee from MongoDB:', id);
        const dbEmployee = await EmployeeModel.findById(id).lean();

        if (!dbEmployee) {
          throw new Error('Employee not found');
        }

        console.log('Employee found in MongoDB');
        return dbEmployee as Employee;
      },
      async () => {
        console.log('MongoDB query failed, falling back to in-memory storage');
        let memoryEmployee = inMemoryEmployees.find(e => e._id === id);

        if (!memoryEmployee) {
          console.log('Employee not found in memory, attempting external API sync...');

          try {
            // Try to sync from external API
            const externalEmployees = await syncExternalEmployeeData();

            // Update in-memory storage
            inMemoryEmployees = externalEmployees;

            // Try to find the employee again
            memoryEmployee = inMemoryEmployees.find(e => e._id === id);

            if (!memoryEmployee) {
              throw new Error('Employee not found after external sync');
            }

            console.log('Employee found after external sync');
          } catch (syncError) {
            console.error('External API sync failed:', syncError);
            throw new Error('Employee not found and sync failed');
          }
        } else {
          console.log('Employee found in memory');
        }

        return memoryEmployee;
      },
      'fetch single employee'
    );

    // Add current status information
    const status = employeeStatuses[id] || {
      status: 'inactive' as const,
      location: employee.location || {
        lat: 0,
        lng: 0,
        address: 'Location not available',
        timestamp: new Date().toISOString()
      },
      lastUpdate: employee.lastSeen || new Date().toISOString()
    };

    const employeeWithStatus = {
      ...employee,
      location: status.location,
      status: status.status,
      lastSeen: status.lastUpdate,
      currentTask: status.currentTask
    };

    res.json(employeeWithStatus);
  } catch (error) {
    console.error("Error fetching employee:", error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: "Employee not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to fetch employee",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// Update employee location
export const updateEmployeeLocation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const locationUpdate: LocationUpdate = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    if (!locationUpdate.lat || !locationUpdate.lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const db = Database.getInstance();

    // Get address for the location
    const address = await reverseGeocode(locationUpdate.lat, locationUpdate.lng);
    
    const updatedLocation = {
      lat: locationUpdate.lat,
      lng: locationUpdate.lng,
      address,
      timestamp: new Date().toISOString()
    };

    // Update in-memory status
    employeeStatuses[id] = {
      status: 'active',
      location: updatedLocation,
      lastUpdate: new Date().toISOString(),
      currentTask: locationUpdate.task
    };

    // Execute database update with fallback
    await db.executeWithFallback(
      async () => {
        console.log('Updating employee location in MongoDB:', id);
        const result = await EmployeeModel.findByIdAndUpdate(
          id,
          {
            location: updatedLocation,
            lastSeen: new Date().toISOString(),
            status: 'active',
            updatedAt: new Date().toISOString()
          },
          { new: true }
        );

        if (!result) {
          throw new Error('Employee not found for location update');
        }

        console.log('Employee location updated in MongoDB');
        return result;
      },
      () => {
        console.log('MongoDB update failed, updating in-memory storage');
        const employeeIndex = inMemoryEmployees.findIndex(e => e._id === id);
        
        if (employeeIndex >= 0) {
          inMemoryEmployees[employeeIndex] = {
            ...inMemoryEmployees[employeeIndex],
            location: updatedLocation,
            lastSeen: new Date().toISOString(),
            status: 'active'
          };
        }
        
        console.log('Employee location updated in memory');
        return true;
      },
      'update employee location'
    );

    const response: LocationUpdateResponse = {
      success: true,
      location: updatedLocation,
      message: "Location updated successfully"
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating employee location:", error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: "Employee not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to update location",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// Sync employees from external API
export const syncEmployees: RequestHandler = async (req, res) => {
  try {
    console.log('Manual employee sync triggered');
    
    const externalEmployees = await syncExternalEmployeeData();
    
    // Update database/memory for each employee
    const syncResults = [];
    for (const employee of externalEmployees) {
      try {
        await syncEmployeeToDatabase(employee);
        syncResults.push({ id: employee._id, status: 'success' });
      } catch (error) {
        console.error(`Failed to sync employee ${employee._id}:`, error);
        syncResults.push({ 
          id: employee._id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = syncResults.filter(r => r.status === 'success').length;
    const errorCount = syncResults.filter(r => r.status === 'error').length;

    res.json({
      message: `Sync completed: ${successCount} successful, ${errorCount} failed`,
      total: externalEmployees.length,
      successful: successCount,
      failed: errorCount,
      results: syncResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error syncing employees:", error);
    res.status(500).json({ 
      error: "Failed to sync employees",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get employee location history (if tracking sessions exist)
export const getEmployeeLocationHistory: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    const db = Database.getInstance();

    if (!id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    // Build query for tracking sessions
    const query: any = { employeeId: id };
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate as string).toISOString();
      }
    }

    // Execute with fallback pattern
    const trackingSessions = await db.executeWithFallback(
      async () => {
        console.log('Fetching tracking sessions from MongoDB...');
        const sessions = await TrackingSession.find(query)
          .sort({ startTime: -1 })
          .limit(parseInt(limit as string))
          .lean();
        
        console.log(`Found ${sessions.length} tracking sessions in database`);
        return sessions;
      },
      () => {
        console.log('MongoDB query failed, no tracking session history available');
        return [];
      },
      'fetch tracking sessions'
    );

    // Extract location points from tracking sessions
    const locationHistory = trackingSessions.flatMap(session => 
      session.locations || []
    ).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, parseInt(limit as string));

    res.json({
      employeeId: id,
      locations: locationHistory,
      total: locationHistory.length,
      dateRange: {
        start: startDate as string,
        end: endDate as string
      }
    });
  } catch (error) {
    console.error("Error fetching location history:", error);
    res.status(500).json({ 
      error: "Failed to fetch location history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export default {
  getEmployees,
  getEmployee,
  updateEmployeeLocation,
  syncEmployees,
  getEmployeeLocationHistory,
};
