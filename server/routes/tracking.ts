import { RequestHandler } from "express";
import axios from "axios";
import {
  TrackingSession as TrackingSessionType,
  TrackingSessionResponse,
  LocationData,
  MeetingDetails,
  MeetingHistoryResponse,
} from "@shared/api";
import { MeetingHistory, TrackingSession as TrackingSessionModel } from "../models";
import type { IMeetingHistory, ITrackingSession } from "../models";

// Rate limiting for Nominatim API (max 1 request per second)
let lastGeocodingTime = 0;
const GEOCODING_DELAY = 2000; // 🔥 FIX: Increase from 1s to 2s to reduce API load
const geocodeCache = new Map<string, { address: string; expires: number }>();
const GEOCACHE_TTL = 7200000; // 🔥 FIX: Increase cache from 1 hour to 2 hours

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";
  
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    console.log(`✅ Using cached address for ${lat}, ${lng}: ${cached.address}`);
    return cached.address;
  }

  try {
    // Rate limiting: wait if needed
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodingTime;
    if (timeSinceLastRequest < GEOCODING_DELAY) {
      const waitTime = GEOCODING_DELAY - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before geocoding`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastGeocodingTime = Date.now();

    console.log(`🗺️ Fetching address for coordinates: ${lat}, ${lng}`);
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'EmployeeTrackingApp/1.0'
      },
      timeout: 8000 // 🔥 FIX: Increase timeout from 5s to 8s to reduce failures
    });

    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    console.log(`✅ Address resolved: ${address}`);
    
    geocodeCache.set(cacheKey, {
      address,
      expires: Date.now() + GEOCACHE_TTL
    });
    
    return address;
  } catch (error) {
    console.error(`⚠️ Reverse geocoding failed for ${lat}, ${lng}:`, error.message);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// In-memory storage for demo purposes
let trackingSessions: TrackingSessionType[] = [];
let sessionIdCounter = 1;

const isDuplicateKeyError = (error: any): boolean =>
  Boolean(error && (error.code === 11000 || error?.errorResponse?.code === 11000));

const generateSessionId = (employeeId: string): string => {
  const safeEmployeeId = String(employeeId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `session_${safeEmployeeId}_${Date.now()}_${randomSuffix}`;
};

// In-memory storage for meeting history with customer details
let meetingHistory: Array<{
  id: string;
  sessionId: string;
  employeeId: string;
  meetingDetails: MeetingDetails;
  timestamp: string;
  leadId?: string;
  leadInfo?: any;
}> = [];
let historyIdCounter = 1;

export const getTrackingSessions: RequestHandler = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit = 50 } = req.query;

    // Build MongoDB query
    const query: any = {};

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate as string).toISOString();
      }
    }

    console.log("Fetching tracking sessions with query:", query);

    // Try to fetch from MongoDB first
    try {
      const mongoSessions = await TrackingSessionModel.find(query)
        .sort({ startTime: -1 })
        .limit(parseInt(limit as string))
        .lean();

      const response: TrackingSessionResponse = {
        sessions: mongoSessions as any as TrackingSessionType[],
        total: mongoSessions.length,
      };

      console.log(`Found ${mongoSessions.length} tracking sessions in MongoDB`);
      res.json(response);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    let filteredSessions = trackingSessions;

    if (employeeId) {
      filteredSessions = filteredSessions.filter(
        (session) => session.employeeId === employeeId,
      );
    }

    if (status) {
      filteredSessions = filteredSessions.filter(
        (session) => session.status === status,
      );
    }

    if (startDate) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          new Date(session.startTime) >= new Date(startDate as string),
      );
    }

    if (endDate) {
      filteredSessions = filteredSessions.filter(
        (session) => new Date(session.startTime) <= new Date(endDate as string),
      );
    }

    filteredSessions.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    if (limit) {
      filteredSessions = filteredSessions.slice(0, parseInt(limit as string));
    }

    const response: TrackingSessionResponse = {
      sessions: filteredSessions,
      total: filteredSessions.length,
    };

    console.log(`Found ${filteredSessions.length} tracking sessions in memory`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching tracking sessions:", error);
    res.status(500).json({ error: "Failed to fetch tracking sessions" });
  }
};

export const createTrackingSession: RequestHandler = async (req, res) => {
  try {
    const { id, employeeId, startTime, startLocation, route, totalDistance, status } = req.body;

    if (!employeeId || !startLocation) {
      return res.status(400).json({
        error: "Employee ID and start location are required",
      });
    }

    console.log("📍 Creating tracking session:", { id, employeeId, startTime });

    // Idempotency guard: if client retries with same id, return existing session.
    if (id) {
      try {
        const existingSession = await TrackingSessionModel.findOne({ id }).lean();
        if (existingSession) {
          console.log("♻️ Tracking session already exists, returning existing session:", id);
          return res.status(200).json(existingSession);
        }
      } catch (lookupError) {
        console.warn("⚠️ Failed duplicate-id precheck for tracking session:", lookupError);
      }
    }

    // 🔹 Resolve start location address if not already resolved
    let resolvedStartLocation = { ...startLocation };
    if (startLocation.lat && startLocation.lng) {
      try {
        console.log("🗺️ Resolving start location address...");
        const address = await reverseGeocode(startLocation.lat, startLocation.lng);
        resolvedStartLocation.address = address;
        console.log("✅ Start location address resolved:", address);
      } catch (error) {
        console.warn("⚠️ Failed to resolve start location address:", error);
        // Keep the address as-is
      }
    }

    const sessionData = {
      id: id || generateSessionId(employeeId) || `session_${String(sessionIdCounter++).padStart(3, "0")}`,
      employeeId,
      startTime: startTime || new Date().toISOString(),
      startLocation: {
        ...resolvedStartLocation,
        timestamp: resolvedStartLocation.timestamp || new Date().toISOString(),
      },
      route: route || [resolvedStartLocation],
      totalDistance: totalDistance || 0,
      status: status || "active" as const,
    };

    // Try to save to MongoDB first
    try {
      const newSession = new TrackingSessionModel(sessionData);
      const savedSession = await newSession.save();

      console.log("Tracking session saved to MongoDB:", savedSession.id);
      res.status(201).json(savedSession);
      return;
    } catch (dbError) {
      if (isDuplicateKeyError(dbError)) {
        try {
          const existingSession = await TrackingSessionModel.findOne({ id: sessionData.id }).lean();
          if (existingSession) {
            console.warn(
              "♻️ Duplicate tracking session create detected; returning existing document:",
              sessionData.id,
            );
            return res.status(200).json(existingSession);
          }
        } catch (duplicateLookupError) {
          console.error("❌ Failed to load duplicate tracking session after E11000:", duplicateLookupError);
        }
      }
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const newSession = sessionData;
    trackingSessions.push(newSession);

    console.log("Tracking session saved to memory:", newSession.id);
    res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating tracking session:", error);
    res.status(500).json({ error: "Failed to create tracking session" });
  }
};

export const updateTrackingSession: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log("📍 Updating tracking session:", id);
    console.log("📍 Updates:", JSON.stringify(updates, null, 2));

    // If ending the session, set end time and calculate duration
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = new Date().toISOString();
      // Duration calculation will be done in the database or after fetch
    }

    // 🔹 CRITICAL FIX: Resolve end location address if coordinates provided
    if (updates.endLocation && updates.endLocation.lat && updates.endLocation.lng) {
      try {
        console.log("🗺️ Resolving end location address...");
        const address = await reverseGeocode(updates.endLocation.lat, updates.endLocation.lng);
        updates.endLocation.address = address;
        console.log("✅ End location address resolved:", address);
      } catch (error) {
        console.warn("⚠️ Failed to resolve end location address:", error);
        // Keep the address as-is (might be coordinates)
      }
    }

    // Try to update in MongoDB first
    try {
      const updatedSession = await TrackingSessionModel.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedSession) {
        console.warn("⚠️ Tracking session not found in database:", id);
        return res.status(404).json({ error: "Tracking session not found in database" });
      }

      // Calculate duration if completing session
      if (updates.status === "completed" && updatedSession.startTime && updatedSession.endTime) {
        const startTime = new Date(updatedSession.startTime).getTime();
        const endTime = new Date(updatedSession.endTime).getTime();
        const duration = Math.floor((endTime - startTime) / 1000);

        await TrackingSessionModel.findOneAndUpdate(
          { id },
          { $set: { duration } },
          { new: true }
        );
        updatedSession.duration = duration;
        console.log("✅ Duration calculated:", duration, "seconds");
      }

      console.log("✅ Tracking session updated in MongoDB:", updatedSession.id);
      if (updatedSession.endLocation) {
        console.log("✅ End location saved:", updatedSession.endLocation);
      }
      res.json(updatedSession);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id,
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    // Calculate duration for in-memory sessions
    if (updates.status === "completed" && !trackingSessions[sessionIndex].endTime) {
      const startTime = new Date(trackingSessions[sessionIndex].startTime).getTime();
      const endTime = new Date(updates.endTime).getTime();
      updates.duration = Math.floor((endTime - startTime) / 1000);
    }

    trackingSessions[sessionIndex] = {
      ...trackingSessions[sessionIndex],
      ...updates,
    };

    console.log("Tracking session updated in memory:", trackingSessions[sessionIndex].id);
    res.json(trackingSessions[sessionIndex]);
  } catch (error) {
    console.error("Error updating tracking session:", error);
    res.status(500).json({ error: "Failed to update tracking session" });
  }
};

export const addLocationToRoute: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    // Add timestamp to location if not provided
    const locationWithTimestamp: LocationData = {
      ...location,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    // Try to update in MongoDB first
    try {
      const session = await TrackingSessionModel.findOne({ id });
      if (!session) {
        return res.status(404).json({ error: "Tracking session not found in database" });
      }

      // Add to route
      session.route.push(locationWithTimestamp);

      // Calculate distance if this isn't the first location
      if (session.route.length > 1) {
        const prevLocation = session.route[session.route.length - 2];
        const distance = calculateDistance(
          prevLocation.lat,
          prevLocation.lng,
          location.lat,
          location.lng,
        );
        session.totalDistance += distance;
      }

      await session.save();

      console.log("Location added to route in MongoDB:", session.id);
      res.json(session);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id,
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    const session = trackingSessions[sessionIndex];

    // Add to route
    session.route.push(locationWithTimestamp);

    // Calculate distance if this isn't the first location
    if (session.route.length > 1) {
      const prevLocation = session.route[session.route.length - 2];
      const distance = calculateDistance(
        prevLocation.lat,
        prevLocation.lng,
        location.lat,
        location.lng,
      );
      session.totalDistance += distance;
    }

    console.log("Location added to route in memory:", session.id);
    res.json(session);
  } catch (error) {
    console.error("Error adding location to route:", error);
    res.status(500).json({ error: "Failed to add location to route" });
  }
};

export const getTrackingSession: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to fetch from MongoDB first
    try {
      const session = await TrackingSessionModel.findOne({ id });
      if (session) {
        console.log("Tracking session found in MongoDB:", session.id);
        res.json(session);
        return;
      }
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const session = trackingSessions.find((session) => session.id === id);

    if (!session) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    console.log("Tracking session found in memory:", session.id);
    res.json(session);
  } catch (error) {
    console.error("Error fetching tracking session:", error);
    res.status(500).json({ error: "Failed to fetch tracking session" });
  }
};

export const deleteTrackingSession: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id,
    );

    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    trackingSessions.splice(sessionIndex, 1);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tracking session:", error);
    res.status(500).json({ error: "Failed to delete tracking session" });
  }
};

// Meeting History endpoints
export const getMeetingHistory: RequestHandler = async (req, res) => {
  try {
    const { employeeId, page = 1, limit = 50, dateRange, startDate, endDate, leadId } = req.query;

    // Build MongoDB query
    const query: any = {};
    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (leadId) {
      query.leadId = leadId;
    }

    // Add date filtering
    if (dateRange || startDate || endDate) {
      const now = new Date();
      let start: Date, end: Date;

      if (dateRange && dateRange !== "custom") {
        switch (dateRange) {
          case "all":
            // Don't set start/end to include all meetings
            break;
          case "today":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
          case "yesterday":
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
            break;
          case "week":
            const startOfWeek = new Date(now.getTime() - (now.getDay() || 7) * 24 * 60 * 60 * 1000);
            start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
          case "month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        }
      } else if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
      }

      if (start && end) {
        query.timestamp = {
          $gte: start.toISOString(),
          $lte: end.toISOString()
        };
        console.log(`Meeting history date filter: ${start.toISOString()} to ${end.toISOString()}`);
      }
    }

    console.log("=== MEETING HISTORY REQUEST ===");
    console.log("Meeting history params:", { employeeId, leadId, dateRange, startDate, endDate });
    console.log("Built MongoDB query:", JSON.stringify(query, null, 2));

    // Debug: Check what data exists in the database
    if (!employeeId && dateRange === "all") {
      try {
        const totalMeetings = await MeetingHistory.countDocuments();
        const uniqueEmployeeIds = await MeetingHistory.distinct('employeeId');
        const uniqueLeadIds = await MeetingHistory.distinct('leadId');
        console.log("=== DATABASE DEBUG INFO ===");
        console.log(`Total meetings in database: ${totalMeetings}`);
        console.log(`Unique employee IDs (${uniqueEmployeeIds.length}):`, uniqueEmployeeIds);
        console.log(`Unique lead IDs (${uniqueLeadIds.filter(id => id).length}):`, uniqueLeadIds.filter(id => id));

        // Check for the specific lead IDs mentioned by user
        const specificLeads = await MeetingHistory.find({
          leadId: { $in: ['JBDSL-0044', 'JBDSL-0001'] }
        }).lean();
        console.log(`Meetings with JBDSL-0044 or JBDSL-0001: ${specificLeads.length}`);
        specificLeads.forEach((meeting) => {
          console.log(`  - Lead: ${meeting.leadId}, Employee: ${meeting.employeeId}, Customer: ${meeting.meetingDetails?.customerName || meeting.meetingDetails?.customers?.[0]?.customerName}`);
        });
      } catch (debugError) {
        console.log("Debug info failed:", debugError.message);
      }
    }

    // Try to fetch from MongoDB first
    try {
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const mongoHistory = await MeetingHistory.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await MeetingHistory.countDocuments(query);

      const response = {
        meetings: mongoHistory,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };

      console.log(`Found ${mongoHistory.length} meeting history entries in MongoDB for employeeId: ${employeeId}`);
      if (mongoHistory.length > 0) {
        console.log("Sample meeting data:", {
          firstMeeting: {
            employeeId: mongoHistory[0].employeeId,
            leadId: mongoHistory[0].leadId,
            customerName: mongoHistory[0].meetingDetails?.customerName,
            timestamp: mongoHistory[0].timestamp
          }
        });
        // Show all unique employee IDs in the results
        const uniqueEmployeeIds = [...new Set(mongoHistory.map(m => m.employeeId))];
        console.log("All employee IDs in results:", uniqueEmployeeIds);
      }
      res.json(response);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    let filteredHistory = meetingHistory;

    if (employeeId) {
      filteredHistory = filteredHistory.filter(
        (history) => history.employeeId === employeeId,
      );
    }

    if (leadId) {
      filteredHistory = filteredHistory.filter(
        (history) => history.leadId === leadId,
      );
    }

    filteredHistory.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    const response = {
      meetings: paginatedHistory,
      total: filteredHistory.length,
      page: pageNum,
      totalPages: Math.ceil(filteredHistory.length / limitNum),
    };

    console.log(`Found ${paginatedHistory.length} meeting history entries in memory`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching meeting history:", error);
    res.status(500).json({ error: "Failed to fetch meeting history" });
  }
};

export const addMeetingToHistory: RequestHandler = async (req, res) => {
  try {
    const { sessionId, employeeId, meetingDetails, leadId, leadInfo } = req.body;

    console.log("Adding meeting to history:", {
      sessionId,
      employeeId,
      meetingDetails,
      leadId,
      leadInfo,
    });

    if (!sessionId || !employeeId || !meetingDetails) {
      return res.status(400).json({
        error: "Session ID, employee ID, and meeting details are required",
      });
    }

    // Validate that discussion is provided (mandatory field)
    if (!meetingDetails.discussion || !meetingDetails.discussion.trim()) {
      return res.status(400).json({
        error: "Discussion details are required",
      });
    }

    // Validate customers array or legacy customer fields
    if (!meetingDetails.customers || meetingDetails.customers.length === 0) {
      // Check if legacy fields are provided for backward compatibility
      if (!meetingDetails.customerName || !meetingDetails.customerEmployeeName) {
        return res.status(400).json({
          error: "At least one customer contact is required",
        });
      }

      // Convert legacy fields to new format
      meetingDetails.customers = [{
        customerName: meetingDetails.customerName,
        customerEmployeeName: meetingDetails.customerEmployeeName,
        customerEmail: meetingDetails.customerEmail || "",
        customerMobile: meetingDetails.customerMobile || "",
        customerDesignation: meetingDetails.customerDesignation || "",
        customerDepartment: meetingDetails.customerDepartment || "",
      }];
    }

    const historyData = {
      sessionId,
      employeeId,
      meetingDetails,
      timestamp: new Date().toISOString(),
      leadId: leadId || undefined,
      leadInfo: leadInfo || undefined,
    };

    // Try to save to MongoDB first
    try {
      const newHistoryEntry = new MeetingHistory(historyData);
      const savedHistory = await newHistoryEntry.save();

      console.log("Meeting history saved to MongoDB:", savedHistory._id);

      // Format the response to match the expected structure
      const formattedResponse = {
        id: savedHistory._id.toString(),
        sessionId: savedHistory.sessionId,
        employeeId: savedHistory.employeeId,
        meetingDetails: savedHistory.meetingDetails,
        timestamp: savedHistory.timestamp,
        leadId: savedHistory.leadId,
        leadInfo: savedHistory.leadInfo,
        _id: savedHistory._id,
        createdAt: savedHistory.createdAt,
        updatedAt: savedHistory.updatedAt
      };

      res.status(201).json(formattedResponse);
      return;
    } catch (dbError) {
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
      // Log the exact error for debugging
      console.error("MongoDB error details:", {
        message: dbError.message,
        stack: dbError.stack,
        data: historyData
      });
    }

    // Fallback to in-memory storage
    const newHistoryEntry = {
      id: `history_${String(historyIdCounter++).padStart(3, "0")}`,
      ...historyData,
    };

    meetingHistory.push(newHistoryEntry);

    console.log("Meeting history entry added to memory:", newHistoryEntry);
    console.log("Total meeting history entries:", meetingHistory.length);

    res.status(201).json(newHistoryEntry);
  } catch (error) {
    console.error("Error adding meeting to history:", error);
    res.status(500).json({ error: "Failed to add meeting to history" });
  }
};

// Save incomplete meeting remarks (called on logout with pending meetings)
export const saveIncompleteMeetingRemark: RequestHandler = async (req, res) => {
  try {
    const { employeeId, reason, pendingMeetings } = req.body;

    if (!employeeId || !pendingMeetings || pendingMeetings.length === 0) {
      return res.status(400).json({
        error: "Employee ID and at least one pending meeting are required",
      });
    }

    console.log("=== SAVING INCOMPLETE MEETING REMARKS ===");
    console.log("Employee ID:", employeeId, "Type:", typeof employeeId);
    console.log("General reason:", reason);
    console.log("Pending meetings count:", pendingMeetings.length);

    // Save a history entry for each incomplete meeting with its individual reason
    const savedEntries = await Promise.all(
      pendingMeetings.map(async (meeting: any, idx: number) => {
        // Use individual meeting reason if provided, otherwise fall back to general reason
        const meetingReason = meeting.incompleteReason || reason || "Meeting not completed";
        
        const meetingDetails = {
          discussion: meetingReason,
          incomplete: true,
          incompleteReason: meetingReason,
          customers: [
            {
              customerName: meeting.customerName || "",
              customerEmployeeName: meeting.customerName || "",
              customerEmail: meeting.customerEmail || "",
              customerMobile: meeting.customerMobile || "",
              customerDesignation: meeting.customerDesignation || "",
              customerDepartment: "",
            },
          ],
        };

        const historyData = {
          sessionId: `logout_incomplete_${Date.now()}_${idx}`,
          employeeId: String(employeeId), // Ensure it's a string
          meetingDetails,
          timestamp: new Date().toISOString(),
          leadId: meeting.leadId,
          leadInfo: {
            id: meeting.leadId,
            companyName: meeting.companyName,
          },
        };

        console.log(`Processing meeting ${idx + 1}:`, {
          employeeId: historyData.employeeId,
          companyName: meeting.companyName,
          customerName: meeting.customerName,
          leadId: meeting.leadId,
          reason: meetingReason,
        });

        // Try to save to MongoDB first
        try {
          const newEntry = new MeetingHistory(historyData);
          const saved = await newEntry.save();
          console.log("✓ Incomplete meeting remark saved to MongoDB:", saved._id);
          console.log("  - Company:", meeting.companyName);
          console.log("  - Saved employeeId:", saved.employeeId);
          console.log("  - Saved incomplete flag:", saved.meetingDetails?.incomplete);
          console.log("  - Reason:", meetingReason);
          return {
            success: true,
            meetingId: meeting._id,
            historyId: saved._id,
            companyName: meeting.companyName,
            reason: meetingReason,
          };
        } catch (dbError) {
          console.warn("MongoDB save failed for incomplete meeting remark:", dbError);
          // Fallback: save to in-memory
          meetingHistory.push({
            id: `history_${String(historyIdCounter++).padStart(3, "0")}`,
            ...historyData,
          });
          console.log("✓ Incomplete meeting remark saved to in-memory storage");
          return { 
            success: true, 
            meetingId: meeting._id,
            companyName: meeting.companyName,
            reason: meetingReason,
          };
        }
      }),
    );

    console.log("=== SAVED INCOMPLETE MEETING REMARKS ===");
    console.log("Total entries saved:", savedEntries.length);
    savedEntries.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. ${entry.companyName}: ${entry.reason}`);
    });

    res.status(201).json({
      success: true,
      reason,
      meetingsProcessed: savedEntries.length,
      entries: savedEntries,
    });
  } catch (error) {
    console.error("Error saving incomplete meeting remarks:", error);
    res.status(500).json({ error: "Failed to save incomplete meeting remarks" });
  }
};


export const getIncompleteMeetingRemark: RequestHandler = async (req, res) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        error: "Employee ID is required",
      });
    }

    console.log("Fetching incomplete meeting remarks for employee:", employeeId);
    console.log("Query filter - employeeId type:", typeof employeeId, "value:", employeeId);

    // Try to fetch from MongoDB first
    try {
      // Build query - ensure employeeId is a string for comparison
      const query = {
        employeeId: String(employeeId),
        "meetingDetails.incomplete": true,
      };
      
      console.log("MongoDB query:", JSON.stringify(query, null, 2));

      const incompleteMeetings = await MeetingHistory.find(query).lean();

      console.log(`Found ${incompleteMeetings.length} incomplete meeting remarks in MongoDB`);
      
      // Debug: Show all incomplete meetings regardless of employeeId
      const allIncomplete = await MeetingHistory.find({
        "meetingDetails.incomplete": true,
      }).lean();
      console.log(`Total incomplete meetings in DB (all employees): ${allIncomplete.length}`);
      
      res.json({ meetings: incompleteMeetings });
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const incompleteMeetings = meetingHistory.filter(
      (history) =>
        String(history.employeeId) === String(employeeId) &&
        history.meetingDetails.incomplete,
    );

    console.log(`Found ${incompleteMeetings.length} incomplete meeting remarks in memory`);
    res.json({ meetings: incompleteMeetings });
  } catch (error) {
    console.error("Error fetching incomplete meeting remarks:", error);
    res.status(500).json({ error: "Failed to fetch incomplete meeting remarks" });
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng1 - lng2) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
