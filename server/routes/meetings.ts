import { RequestHandler } from "express";
import axios from 'axios';
import NodeCache from 'node-cache';
import Database from '../config/database.js';

// In-memory storage for fallback when database is unavailable
let inMemoryMeetings: MeetingLog[] = [];
let meetingIdCounter = 1;
import {
  MeetingLog,
  MeetingLogsResponse,
  CreateMeetingRequest,
} from "@shared/api";
import { Meeting, IMeeting } from "../models";

// Initialize cache with 1 hour TTL
const geocodeCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Helper function for reverse geocoding with improved error handling
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";
  
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cachedAddress = geocodeCache.get<string>(cacheKey);
  if (cachedAddress) return cachedAddress;

  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
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
      timeout: 8000 // Increased timeout
    });

    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geocodeCache.set(cacheKey, address);
    return address;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geocodeCache.set(cacheKey, fallbackAddress, 300); // Cache for 5 minutes
    return fallbackAddress;
  }
}

// Enhanced meeting conversion with better error handling
async function convertMeetingToLog(meeting: IMeeting): Promise<MeetingLog> {
  try {
    const startAddress = meeting.startLocation?.lat && meeting.startLocation?.lng
      ? await reverseGeocode(meeting.startLocation.lat, meeting.startLocation.lng)
      : "Location not available";

    const endAddress = meeting.endLocation?.lat && meeting.endLocation?.lng
      ? await reverseGeocode(meeting.endLocation.lat, meeting.endLocation.lng)
      : meeting.status === 'completed' ? "Location not available" : undefined;

    return {
      id: meeting._id.toString(),
      employeeId: meeting.employeeId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      duration: meeting.duration,
      status: meeting.status,

      // Backward compatibility - include location field pointing to startLocation
      location: meeting.startLocation ? {
        ...meeting.startLocation,
        address: startAddress
      } : {
        lat: 0,
        lng: 0,
        address: "Location not available",
        timestamp: meeting.startTime
      },

      startLocation: meeting.startLocation ? {
        ...meeting.startLocation,
        address: startAddress
      } : undefined,

      endLocation: meeting.endLocation ? {
        ...meeting.endLocation,
        address: endAddress
      } : undefined,
      
      // Customer details (legacy format for backward compatibility)
      customerName: meeting.customers?.[0]?.customerName || meeting.customerName || "",
      customerEmployeeName: meeting.customers?.[0]?.customerEmployeeName || meeting.customerEmployeeName || "",
      customerEmail: meeting.customers?.[0]?.customerEmail || meeting.customerEmail || "",
      customerMobile: meeting.customers?.[0]?.customerMobile || meeting.customerMobile || "",
      customerDesignation: meeting.customers?.[0]?.customerDesignation || meeting.customerDesignation || "",
      customerDepartment: meeting.customers?.[0]?.customerDepartment || meeting.customerDepartment || "",
      
      // New multi-customer support
      customers: meeting.customers || [],
      
      discussion: meeting.discussion || "",
      notes: meeting.notes || "",
      trackingSessionId: meeting.trackingSessionId,
      
      // Route screenshot information
      routeScreenshot: meeting.routeScreenshot,
      
      createdAt: meeting.createdAt || meeting.startTime,
      updatedAt: meeting.updatedAt || meeting.startTime,
    };
  } catch (error) {
    console.error('Error converting meeting to log:', error);
    // Return a basic conversion without geocoding if there's an error
    return {
      id: meeting._id.toString(),
      employeeId: meeting.employeeId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      duration: meeting.duration,
      status: meeting.status,
      
      startLocation: meeting.startLocation ? {
        ...meeting.startLocation,
        address: `${meeting.startLocation.lat.toFixed(6)}, ${meeting.startLocation.lng.toFixed(6)}`
      } : undefined,
      
      endLocation: meeting.endLocation ? {
        ...meeting.endLocation,
        address: `${meeting.endLocation.lat.toFixed(6)}, ${meeting.endLocation.lng.toFixed(6)}`
      } : undefined,
      
      customerName: meeting.customers?.[0]?.customerName || meeting.customerName || "",
      customerEmployeeName: meeting.customers?.[0]?.customerEmployeeName || meeting.customerEmployeeName || "",
      customerEmail: meeting.customers?.[0]?.customerEmail || meeting.customerEmail || "",
      customerMobile: meeting.customers?.[0]?.customerMobile || meeting.customerMobile || "",
      customerDesignation: meeting.customers?.[0]?.customerDesignation || meeting.customerDesignation || "",
      customerDepartment: meeting.customers?.[0]?.customerDepartment || meeting.customerDepartment || "",
      
      customers: meeting.customers || [],
      discussion: meeting.discussion || "",
      notes: meeting.notes || "",
      trackingSessionId: meeting.trackingSessionId,
      routeScreenshot: meeting.routeScreenshot,
      
      createdAt: meeting.createdAt || meeting.startTime,
      updatedAt: meeting.updatedAt || meeting.startTime,
    };
  }
}

// Get meetings with improved error handling
export const getMeetings: RequestHandler = async (req, res) => {
  try {
    const { employeeId, limit = 50, offset = 0, status } = req.query;
    const db = Database.getInstance();

    // Build query
    const query: any = {};
    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (status) {
      query.status = status;
    }

    // Execute with fallback pattern
    const meetings = await db.executeWithFallback(
      async () => {
        console.log('Fetching meetings from MongoDB...');
        const dbMeetings = await Meeting.find(query)
          .sort({ startTime: -1 })
          .limit(parseInt(limit as string))
          .skip(parseInt(offset as string));
        
        console.log(`Found ${dbMeetings.length} meetings in database`);
        return dbMeetings;
      },
      () => {
        console.log('MongoDB query failed, falling back to in-memory storage');
        let filteredMeetings = inMemoryMeetings;
        
        if (employeeId) {
          filteredMeetings = filteredMeetings.filter(m => m.employeeId === employeeId);
        }
        if (status) {
          filteredMeetings = filteredMeetings.filter(m => m.status === status);
        }
        
        const startIndex = parseInt(offset as string);
        const endIndex = startIndex + parseInt(limit as string);
        const result = filteredMeetings.slice(startIndex, endIndex);
        
        console.log(`Found ${result.length} meetings in memory`);
        return result.map(meeting => ({
          ...meeting,
          _id: meeting.id,
          toObject: () => meeting
        })) as any[];
      },
      'fetch meetings'
    );

    // Convert to logs
    const logs: MeetingLog[] = [];
    for (const meeting of meetings) {
      try {
        if ('toObject' in meeting) {
          logs.push(await convertMeetingToLog(meeting as IMeeting));
        } else {
          logs.push(meeting as MeetingLog);
        }
      } catch (error) {
        console.error('Error processing meeting:', error);
        // Skip problematic meetings rather than failing the entire request
      }
    }

    const response: MeetingLogsResponse = {
      meetings: logs,
      total: logs.length,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getMeetings:", error);
    
    // Fallback to in-memory data
    try {
      const { employeeId, limit = 50, offset = 0, status } = req.query;
      let filteredMeetings = inMemoryMeetings;
      
      if (employeeId) {
        filteredMeetings = filteredMeetings.filter(m => m.employeeId === employeeId);
      }
      if (status) {
        filteredMeetings = filteredMeetings.filter(m => m.status === status);
      }
      
      const startIndex = parseInt(offset as string);
      const endIndex = startIndex + parseInt(limit as string);
      const result = filteredMeetings.slice(startIndex, endIndex);
      
      const response: MeetingLogsResponse = {
        meetings: result,
        total: result.length,
        offset: startIndex,
        limit: parseInt(limit as string),
      };

      console.log('Serving from in-memory fallback');
      res.json(response);
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      res.status(500).json({ 
        error: "Failed to fetch meetings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// Create meeting with improved error handling
export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const meetingData: CreateMeetingRequest = req.body;
    
    // Validate required fields
    if (!meetingData.employeeId) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const db = Database.getInstance();
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Execute with fallback pattern
    const meeting = await db.executeWithFallback(
      async () => {
        console.log('Creating meeting in MongoDB...');
        const newMeeting = new Meeting({
          _id: meetingId,
          employeeId: meetingData.employeeId,
          startTime: meetingData.startTime || new Date().toISOString(),
          status: 'active',
          startLocation: meetingData.startLocation || meetingData.location,
          trackingSessionId: meetingData.trackingSessionId,
          customers: meetingData.customers || [],
          // Legacy fields for backward compatibility
          customerName: meetingData.customerName || "",
          customerEmployeeName: meetingData.customerEmployeeName || "",
          customerEmail: meetingData.customerEmail || "",
          customerMobile: meetingData.customerMobile || "",
          customerDesignation: meetingData.customerDesignation || "",
          customerDepartment: meetingData.customerDepartment || "",
          discussion: meetingData.discussion || "",
          notes: meetingData.notes || "",
          endTime: undefined, // Will be set when meeting is ended
          duration: undefined,
          endLocation: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const savedMeeting = await newMeeting.save();
        console.log('Meeting saved to MongoDB:', savedMeeting._id);
        return savedMeeting;
      },
      () => {
        console.log('MongoDB save failed, falling back to in-memory storage');
        const inMemoryMeeting: MeetingLog = {
          id: meetingId,
          employeeId: meetingData.employeeId,
          startTime: meetingData.startTime || new Date().toISOString(),
          status: 'active',
          startLocation: meetingData.startLocation || meetingData.location,
          trackingSessionId: meetingData.trackingSessionId,
          customers: meetingData.customers || [],
          customerName: meetingData.customerName || "",
          customerEmployeeName: meetingData.customerEmployeeName || "",
          customerEmail: meetingData.customerEmail || "",
          customerMobile: meetingData.customerMobile || "",
          customerDesignation: meetingData.customerDesignation || "",
          customerDepartment: meetingData.customerDepartment || "",
          discussion: meetingData.discussion || "",
          notes: meetingData.notes || "",
          endTime: undefined,
          duration: undefined,
          endLocation: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        inMemoryMeetings.push(inMemoryMeeting);
        console.log('Meeting saved to memory:', meetingId);
        return inMemoryMeeting;
      },
      'create meeting'
    );

    // Convert response
    let response: MeetingLog;
    if ('toObject' in meeting) {
      response = await convertMeetingToLog(meeting as IMeeting);
    } else {
      response = meeting as MeetingLog;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ 
      error: "Failed to create meeting",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Update meeting with improved error handling
export const updateMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = Database.getInstance();

    // Execute with fallback pattern
    const meeting = await db.executeWithFallback(
      async () => {
        console.log('Updating meeting in MongoDB:', id);
        const updatedMeeting = await Meeting.findByIdAndUpdate(
          id,
          { 
            ...updateData,
            updatedAt: new Date().toISOString()
          },
          { new: true }
        );

        if (!updatedMeeting) {
          throw new Error('Meeting not found');
        }

        console.log('Meeting updated in MongoDB');
        return updatedMeeting;
      },
      () => {
        console.log('MongoDB update failed, falling back to in-memory storage');
        const meetingIndex = inMemoryMeetings.findIndex(m => m.id === id);
        
        if (meetingIndex === -1) {
          throw new Error('Meeting not found in memory');
        }

        inMemoryMeetings[meetingIndex] = {
          ...inMemoryMeetings[meetingIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };

        console.log('Meeting updated in memory');
        return inMemoryMeetings[meetingIndex];
      },
      'update meeting'
    );

    // Convert response
    let response: MeetingLog;
    if ('toObject' in meeting) {
      response = await convertMeetingToLog(meeting as IMeeting);
    } else {
      response = meeting as MeetingLog;
    }

    res.json(response);
  } catch (error) {
    console.error("Error updating meeting:", error);
    
    if (error instanceof Error && error.message === 'Meeting not found') {
      res.status(404).json({ error: "Meeting not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to update meeting",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// Delete meeting with improved error handling
export const deleteMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const db = Database.getInstance();

    // Execute with fallback pattern
    await db.executeWithFallback(
      async () => {
        console.log('Deleting meeting from MongoDB:', id);
        const deletedMeeting = await Meeting.findByIdAndDelete(id);
        
        if (!deletedMeeting) {
          throw new Error('Meeting not found');
        }

        console.log('Meeting deleted from MongoDB');
        return deletedMeeting;
      },
      () => {
        console.log('MongoDB delete failed, falling back to in-memory storage');
        const meetingIndex = inMemoryMeetings.findIndex(m => m.id === id);
        
        if (meetingIndex === -1) {
          throw new Error('Meeting not found in memory');
        }

        inMemoryMeetings.splice(meetingIndex, 1);
        console.log('Meeting deleted from memory');
        return true;
      },
      'delete meeting'
    );

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting meeting:", error);
    
    if (error instanceof Error && error.message === 'Meeting not found') {
      res.status(404).json({ error: "Meeting not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to delete meeting",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

// Get meeting by ID with improved error handling
export const getMeetingById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const db = Database.getInstance();

    // Execute with fallback pattern
    const meeting = await db.executeWithFallback(
      async () => {
        console.log('Fetching meeting from MongoDB:', id);
        const dbMeeting = await Meeting.findById(id);
        
        if (!dbMeeting) {
          throw new Error('Meeting not found');
        }

        console.log('Meeting found in MongoDB');
        return dbMeeting;
      },
      () => {
        console.log('MongoDB query failed, falling back to in-memory storage');
        const memoryMeeting = inMemoryMeetings.find(m => m.id === id);
        
        if (!memoryMeeting) {
          throw new Error('Meeting not found in memory');
        }

        console.log('Meeting found in memory');
        return memoryMeeting;
      },
      'fetch meeting by ID'
    );

    // Convert response
    let response: MeetingLog;
    if ('toObject' in meeting) {
      response = await convertMeetingToLog(meeting as IMeeting);
    } else {
      response = meeting as MeetingLog;
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: "Meeting not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to fetch meeting",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

export default {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingById,
};
