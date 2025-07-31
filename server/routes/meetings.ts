import { RequestHandler } from "express";
import axios from 'axios';
import NodeCache from 'node-cache';

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

// Helper function for reverse geocoding
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";
  
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cachedAddress = geocodeCache.get<string>(cacheKey);
  if (cachedAddress) return cachedAddress;

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
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
    geocodeCache.set(cacheKey, address);
    return address;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Enhanced meeting conversion with address handling
async function convertMeetingToMeetingLog(meeting: IMeeting): Promise<MeetingLog> {
  const location = meeting.location;
  const address = await reverseGeocode(location.lat, location.lng);

  // Handle end location if it exists
  let endLocation = undefined;
  if (meeting.endLocation) {
    const endAddress = await reverseGeocode(meeting.endLocation.lat, meeting.endLocation.lng);
    endLocation = {
      ...meeting.endLocation,
      address: endAddress
    };
  }

  return {
    id: meeting._id.toString(),
    employeeId: meeting.employeeId,
    location: {
      ...location,
      address // Use the geocoded address
    },
    endLocation,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    clientName: meeting.clientName,
    notes: meeting.notes,
    status: meeting.status as "started" | "in-progress" | "completed",
    trackingSessionId: meeting.trackingSessionId,
    leadId: meeting.leadId,
    leadInfo: meeting.leadInfo,
    meetingDetails: meeting.meetingDetails,
  };
}

export const getMeetings: RequestHandler = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit = 50 } = req.query;

    // Build query
    const query: any = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate as string);
      if (endDate) query.startTime.$lte = new Date(endDate as string);
    }

    // Try MongoDB first
    try {
      const mongoMeetings = await Meeting.find(query)
        .sort({ startTime: -1 })
        .limit(parseInt(limit as string))
        .lean();

      // Convert all meetings with proper addresses
      const meetingLogs = await Promise.all(
        mongoMeetings.map(meeting => convertMeetingToMeetingLog(meeting))
      );

      const response: MeetingLogsResponse = {
        meetings: meetingLogs,
        total: meetingLogs.length,
      };

      res.json(response);
      return;
    } catch (dbError) {
      console.error("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    let filteredMeetings = inMemoryMeetings;

    if (employeeId) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => meeting.employeeId === employeeId,
      );
    }

    if (status) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => meeting.status === status,
      );
    }

    if (startDate || endDate) {
      filteredMeetings = filteredMeetings.filter((meeting) => {
        const meetingDate = new Date(meeting.startTime);
        if (startDate && meetingDate < new Date(startDate as string)) return false;
        if (endDate && meetingDate > new Date(endDate as string)) return false;
        return true;
      });
    }

    filteredMeetings.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    if (limit) {
      filteredMeetings = filteredMeetings.slice(0, parseInt(limit as string));
    }

    const fallbackResponse: MeetingLogsResponse = {
      meetings: filteredMeetings,
      total: filteredMeetings.length,
    };

    console.log(`Found ${filteredMeetings.length} meetings in memory`);
    res.json(fallbackResponse);
  } catch (error) {
    console.error("Error fetching meetings:", error);

    // Always return a valid response structure, even on error
    const errorResponse: MeetingLogsResponse = {
      meetings: [],
      total: 0,
    };

    res.status(500).json(errorResponse);
  }
};

export const getMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Try MongoDB first
    try {
      const meeting = await Meeting.findById(id).lean();
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const meetingLog = await convertMeetingToMeetingLog(meeting);
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.error("MongoDB query failed, checking in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meeting = inMemoryMeetings.find((m) => m.id === id);
    if (meeting) {
      res.json(meeting);
      return;
    }

    return res.status(404).json({ error: "Meeting not found" });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const { employeeId, location, clientName, notes, leadId, leadInfo } = req.body;

    if (!employeeId || !location) {
      return res.status(400).json({ error: "Employee ID and location are required" });
    }

    // Get human-readable address
    const address = await reverseGeocode(location.lat, location.lng);

    const meetingData = {
      employeeId,
      location: {
        ...location,
        address,
        timestamp: new Date().toISOString()
      },
      startTime: new Date().toISOString(),
      clientName,
      notes,
      status: "in-progress" as const,
      leadId: leadId || undefined,
      leadInfo: leadInfo || undefined,
    };

    // Try MongoDB first
    try {
      const newMeeting = new Meeting(meetingData);
      const savedMeeting = await newMeeting.save();
      const meetingLog = await convertMeetingToMeetingLog(savedMeeting);
      
      res.status(201).json(meetingLog);
      return;
    } catch (dbError) {
      console.error("MongoDB save failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meetingId = `meeting_${String(meetingIdCounter++).padStart(3, "0")}`;
    const inMemoryMeeting: MeetingLog = {
      id: meetingId,
      employeeId: meetingData.employeeId,
      location: meetingData.location,
      startTime: meetingData.startTime,
      endTime: undefined, // New meetings don't have an end time yet
      clientName: meetingData.clientName,
      notes: meetingData.notes,
      status: meetingData.status,
      leadId: meetingData.leadId,
      leadInfo: meetingData.leadInfo,
    };

    inMemoryMeetings.push(inMemoryMeeting);
    console.log("Meeting created in memory:", meetingId);
    res.status(201).json(inMemoryMeeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const updateMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle meeting completion
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = new Date().toISOString();
    }

    // Handle end location - if provided, use it; otherwise try to get current location
    if (updates.status === "completed" && updates.endLocation) {
      // Geocode the end location if address is not provided
      if (!updates.endLocation.address) {
        try {
          const address = await reverseGeocode(updates.endLocation.lat, updates.endLocation.lng);
          updates.endLocation.address = address;
        } catch (geocodeError) {
          console.warn('Failed to geocode end location:', geocodeError);
          updates.endLocation.address = `${updates.endLocation.lat.toFixed(6)}, ${updates.endLocation.lng.toFixed(6)}`;
        }
      }
      if (!updates.endLocation.timestamp) {
        updates.endLocation.timestamp = new Date().toISOString();
      }
    }

    // Validate meeting details
    if (updates.meetingDetails && !updates.meetingDetails.discussion?.trim()) {
      return res.status(400).json({ error: "Discussion details are required" });
    }

    // Try MongoDB first
    try {
      const updatedMeeting = await Meeting.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedMeeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const meetingLog = await convertMeetingToMeetingLog(updatedMeeting);
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.error("MongoDB update failed, checking in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meetingIndex = inMemoryMeetings.findIndex((m) => m.id === id);
    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    inMemoryMeetings[meetingIndex] = {
      ...inMemoryMeetings[meetingIndex],
      ...updates,
    };

    console.log("Meeting updated in memory:", id);
    res.json(inMemoryMeetings[meetingIndex]);
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

export const deleteMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Try MongoDB first
    try {
      const deletedMeeting = await Meeting.findByIdAndDelete(id);
      if (!deletedMeeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      res.status(204).send();
      return;
    } catch (dbError) {
      console.error("MongoDB delete failed, checking in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meetingIndex = inMemoryMeetings.findIndex((m) => m.id === id);
    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    inMemoryMeetings.splice(meetingIndex, 1);
    console.log("Meeting deleted from memory:", id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

// Add this endpoint to clear geocoding cache
export const clearGeocodeCache: RequestHandler = async (req, res) => {
  try {
    geocodeCache.flushAll();
    res.json({ success: true, message: "Geocode cache cleared" });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
};
