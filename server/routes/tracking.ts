import { RequestHandler } from "express";
import {
  TrackingSession,
  TrackingSessionResponse,
  LocationData,
  MeetingDetails,
  MeetingHistoryResponse,
} from "@shared/api";
import { MeetingHistory, IMeetingHistory, TrackingSession, ITrackingSession } from "../models";

// In-memory storage for demo purposes
let trackingSessions: TrackingSession[] = [];
let sessionIdCounter = 1;

// In-memory storage for meeting history with customer details
let meetingHistory: Array<{
  id: string;
  sessionId: string;
  employeeId: string;
  meetingDetails: MeetingDetails;
  timestamp: string;
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
      const mongoSessions = await TrackingSession.find(query)
        .sort({ startTime: -1 })
        .limit(parseInt(limit as string))
        .lean();

      const response: TrackingSessionResponse = {
        sessions: mongoSessions,
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
    const { employeeId, startLocation } = req.body;

    if (!employeeId || !startLocation) {
      return res.status(400).json({
        error: "Employee ID and start location are required",
      });
    }

    const sessionData = {
      id: `session_${String(sessionIdCounter++).padStart(3, "0")}`,
      employeeId,
      startTime: new Date().toISOString(),
      startLocation: {
        ...startLocation,
        timestamp: new Date().toISOString(),
      },
      route: [startLocation],
      totalDistance: 0,
      status: "active" as const,
    };

    // Try to save to MongoDB first
    try {
      const newSession = new TrackingSession(sessionData);
      const savedSession = await newSession.save();

      console.log("Tracking session saved to MongoDB:", savedSession.id);
      res.status(201).json(savedSession);
      return;
    } catch (dbError) {
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

    // If ending the session, set end time and calculate duration
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = new Date().toISOString();
      // Duration calculation will be done in the database or after fetch
    }

    // Try to update in MongoDB first
    try {
      const updatedSession = await TrackingSession.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedSession) {
        return res.status(404).json({ error: "Tracking session not found in database" });
      }

      // Calculate duration if completing session
      if (updates.status === "completed" && updatedSession.startTime && updatedSession.endTime) {
        const startTime = new Date(updatedSession.startTime).getTime();
        const endTime = new Date(updatedSession.endTime).getTime();
        const duration = Math.floor((endTime - startTime) / 1000);

        await TrackingSession.findOneAndUpdate(
          { id },
          { $set: { duration } },
          { new: true }
        );
        updatedSession.duration = duration;
      }

      console.log("Tracking session updated in MongoDB:", updatedSession.id);
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
      const session = await TrackingSession.findOne({ id });
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
      const session = await TrackingSession.findOne({ id });
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
