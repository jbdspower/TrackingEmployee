import { RequestHandler } from "express";
import Database from '../config/database.js';
import {
  TrackingSession as TrackingSessionType,
  TrackingSessionResponse,
  LocationData,
  MeetingDetails,
  MeetingHistoryResponse,
} from "@shared/api";
import { MeetingHistory, IMeetingHistory, TrackingSession, ITrackingSession } from "../models";

// In-memory storage for demo purposes
let trackingSessions: TrackingSessionType[] = [];
let sessionIdCounter = 1;

// In-memory storage for meeting history with customer details
let meetingHistory: Array<{
  id: string;
  sessionId: string;
  employeeId: string;
  meetingDetails: MeetingDetails;
  timestamp: string;
  leadId?: string;
}> = [];
let historyIdCounter = 1;

export const getTrackingSessions: RequestHandler = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit = 50 } = req.query;
    const db = Database.getInstance();

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

    console.log(`Fetching tracking sessions with query:`, JSON.stringify(query, null, 2));

    // Execute with fallback pattern
    const sessions = await db.executeWithFallback(
      async () => {
        console.log('Fetching tracking sessions from MongoDB...');
        const dbSessions = await TrackingSession.find(query)
          .sort({ startTime: -1 })
          .limit(parseInt(limit as string))
          .lean();
        
        console.log(`Found ${dbSessions.length} tracking sessions in database`);
        return dbSessions.map(session => ({
          id: session._id.toString(),
          employeeId: session.employeeId,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          locations: session.locations || [],
          totalDistance: session.totalDistance || 0,
          createdAt: session.createdAt || session.startTime,
          updatedAt: session.updatedAt || session.startTime,
        })) as TrackingSessionType[];
      },
      () => {
        console.log('MongoDB query failed, falling back to in-memory storage');
        let filteredSessions = trackingSessions;
        
        if (employeeId) {
          filteredSessions = filteredSessions.filter(s => s.employeeId === employeeId);
        }
        if (status) {
          filteredSessions = filteredSessions.filter(s => s.status === status);
        }
        if (startDate) {
          filteredSessions = filteredSessions.filter(s => 
            new Date(s.startTime) >= new Date(startDate as string)
          );
        }
        if (endDate) {
          filteredSessions = filteredSessions.filter(s => 
            new Date(s.startTime) <= new Date(endDate as string)
          );
        }
        
        const result = filteredSessions
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, parseInt(limit as string));
        
        console.log(`Found ${result.length} tracking sessions in memory`);
        return result;
      },
      'fetch tracking sessions'
    );

    const response: TrackingSessionResponse = {
      sessions,
      total: sessions.length,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching tracking sessions:", error);
    
    // Final fallback
    try {
      const response: TrackingSessionResponse = {
        sessions: [],
        total: 0,
        error: "Service temporarily unavailable"
      };
      res.json(response);
    } catch (fallbackError) {
      res.status(500).json({ 
        error: "Failed to fetch tracking sessions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

export const createTrackingSession: RequestHandler = async (req, res) => {
  try {
    const { employeeId, startLocation } = req.body;
    const db = Database.getInstance();

    // Enhanced validation
    if (!employeeId) {
      console.error('createTrackingSession: Missing employeeId');
      return res.status(400).json({
        error: "Employee ID is required",
        details: "No employeeId provided in request body"
      });
    }

    if (typeof employeeId !== 'string' || employeeId.trim() === '') {
      console.error('createTrackingSession: Invalid employeeId format:', {
        employeeId,
        type: typeof employeeId
      });
      return res.status(400).json({
        error: "Invalid Employee ID format",
        details: "Employee ID must be a non-empty string"
      });
    }

    if (employeeId === 'undefined' || employeeId === 'null') {
      console.error('createTrackingSession: employeeId is literal undefined/null string');
      return res.status(400).json({
        error: "Invalid Employee ID",
        details: "Employee ID cannot be 'undefined' or 'null'"
      });
    }

    const sessionId = `session_${String(sessionIdCounter++).padStart(3, '0')}`;
    const startTime = new Date().toISOString();

    const sessionData = {
      _id: sessionId,
      employeeId,
      startTime,
      status: 'active' as const,
      locations: startLocation ? [startLocation] : [],
      totalDistance: 0,
      createdAt: startTime,
      updatedAt: startTime,
    };

    // Execute with fallback pattern
    const session = await db.executeWithFallback(
      async () => {
        console.log('Creating tracking session in MongoDB...');
        const newSession = new TrackingSession(sessionData);
        const savedSession = await newSession.save();
        
        console.log('Tracking session saved to MongoDB:', savedSession._id);
        return {
          id: savedSession._id.toString(),
          employeeId: savedSession.employeeId,
          startTime: savedSession.startTime,
          endTime: savedSession.endTime,
          status: savedSession.status,
          locations: savedSession.locations || [],
          totalDistance: savedSession.totalDistance || 0,
          createdAt: savedSession.createdAt || savedSession.startTime,
          updatedAt: savedSession.updatedAt || savedSession.startTime,
        } as TrackingSessionType;
      },
      () => {
        console.log('MongoDB save failed, falling back to in-memory storage');
        const memorySession: TrackingSessionType = {
          id: sessionId,
          employeeId,
          startTime,
          status: 'active',
          locations: startLocation ? [startLocation] : [],
          totalDistance: 0,
          createdAt: startTime,
          updatedAt: startTime,
        };
        
        trackingSessions.push(memorySession);
        console.log('Tracking session saved to memory:', sessionId);
        return memorySession;
      },
      'create tracking session'
    );

    res.status(201).json(session);
  } catch (error) {
    console.error("Error creating tracking session:", error);
    res.status(500).json({ 
      error: "Failed to create tracking session",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updateTrackingSessionLocation: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const locationData: LocationData = req.body;
    const db = Database.getInstance();

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    if (!locationData.lat || !locationData.lng) {
      return res.status(400).json({ error: "Location coordinates are required" });
    }

    // Execute with fallback pattern
    const session = await db.executeWithFallback(
      async () => {
        console.log('Updating tracking session location in MongoDB:', sessionId);
        const updatedSession = await TrackingSession.findByIdAndUpdate(
          sessionId,
          {
            $push: { locations: locationData },
            $set: { updatedAt: new Date().toISOString() }
          },
          { new: true }
        ).lean();

        if (!updatedSession) {
          throw new Error('Tracking session not found');
        }

        console.log('Tracking session location updated in MongoDB');
        return {
          id: updatedSession._id.toString(),
          employeeId: updatedSession.employeeId,
          startTime: updatedSession.startTime,
          endTime: updatedSession.endTime,
          status: updatedSession.status,
          locations: updatedSession.locations || [],
          totalDistance: updatedSession.totalDistance || 0,
          createdAt: updatedSession.createdAt || updatedSession.startTime,
          updatedAt: updatedSession.updatedAt || updatedSession.startTime,
        } as TrackingSessionType;
      },
      () => {
        console.log('MongoDB update failed, falling back to in-memory storage');
        const sessionIndex = trackingSessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex === -1) {
          throw new Error('Tracking session not found in memory');
        }

        trackingSessions[sessionIndex].locations.push(locationData);
        trackingSessions[sessionIndex].updatedAt = new Date().toISOString();
        
        // Calculate total distance if we have multiple locations
        if (trackingSessions[sessionIndex].locations.length > 1) {
          const locations = trackingSessions[sessionIndex].locations;
          let totalDistance = 0;
          
          for (let i = 1; i < locations.length; i++) {
            const prev = locations[i - 1];
            const curr = locations[i];
            const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
            totalDistance += distance;
          }
          
          trackingSessions[sessionIndex].totalDistance = Math.round(totalDistance * 100) / 100;
        }

        console.log('Tracking session location updated in memory');
        return trackingSessions[sessionIndex];
      },
      'update tracking session location'
    );

    res.json(session);
  } catch (error) {
    console.error("Error updating tracking session location:", error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: "Tracking session not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to update tracking session location",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

export const endTrackingSession: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { endLocation } = req.body;
    const db = Database.getInstance();

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const endTime = new Date().toISOString();

    // Execute with fallback pattern
    const session = await db.executeWithFallback(
      async () => {
        console.log('Ending tracking session in MongoDB:', sessionId);
        const updateData: any = {
          status: 'completed',
          endTime,
          updatedAt: endTime
        };

        if (endLocation) {
          updateData.$push = { locations: endLocation };
        }

        const updatedSession = await TrackingSession.findByIdAndUpdate(
          sessionId,
          updateData,
          { new: true }
        ).lean();

        if (!updatedSession) {
          throw new Error('Tracking session not found');
        }

        console.log('Tracking session ended in MongoDB');
        return {
          id: updatedSession._id.toString(),
          employeeId: updatedSession.employeeId,
          startTime: updatedSession.startTime,
          endTime: updatedSession.endTime,
          status: updatedSession.status,
          locations: updatedSession.locations || [],
          totalDistance: updatedSession.totalDistance || 0,
          createdAt: updatedSession.createdAt || updatedSession.startTime,
          updatedAt: updatedSession.updatedAt || updatedSession.startTime,
        } as TrackingSessionType;
      },
      () => {
        console.log('MongoDB update failed, falling back to in-memory storage');
        const sessionIndex = trackingSessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex === -1) {
          throw new Error('Tracking session not found in memory');
        }

        if (endLocation) {
          trackingSessions[sessionIndex].locations.push(endLocation);
        }

        trackingSessions[sessionIndex].status = 'completed';
        trackingSessions[sessionIndex].endTime = endTime;
        trackingSessions[sessionIndex].updatedAt = endTime;

        console.log('Tracking session ended in memory');
        return trackingSessions[sessionIndex];
      },
      'end tracking session'
    );

    res.json(session);
  } catch (error) {
    console.error("Error ending tracking session:", error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: "Tracking session not found" });
    } else {
      res.status(500).json({ 
        error: "Failed to end tracking session",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

export const getMeetingHistory: RequestHandler = async (req, res) => {
  try {
    const { employeeId, leadId, dateRange, startDate, endDate } = req.query;
    const db = Database.getInstance();

    console.log('=== MEETING HISTORY REQUEST ===');
    console.log('Meeting history params:', {
      employeeId,
      leadId,
      dateRange,
      startDate,
      endDate
    });

    // Build MongoDB query
    const query: any = {};
    
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    if (leadId) {
      query.leadId = leadId;
    }

    // Handle date filtering
    if (dateRange === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      query.timestamp = {
        $gte: startOfDay.toISOString(),
        $lt: endOfDay.toISOString()
      };
    } else if (dateRange === 'week') {
      const today = new Date();
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
      query.timestamp = {
        $gte: startOfWeek.toISOString()
      };
    } else if (dateRange === 'month') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      query.timestamp = {
        $gte: startOfMonth.toISOString()
      };
    } else if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string).toISOString();
      }
    }

    console.log('Built MongoDB query:', JSON.stringify(query, null, 2));

    // Execute with fallback pattern
    const history = await db.executeWithFallback(
      async () => {
        console.log('Fetching meeting history from MongoDB...');
        const dbHistory = await MeetingHistory.find(query)
          .sort({ timestamp: -1 })
          .limit(100)
          .lean();
        
        console.log(`Found ${dbHistory.length} meeting history entries in database`);
        return dbHistory.map(entry => ({
          id: entry._id.toString(),
          sessionId: entry.sessionId,
          employeeId: entry.employeeId,
          meetingDetails: entry.meetingDetails,
          timestamp: entry.timestamp,
          leadId: entry.leadId,
        }));
      },
      () => {
        console.log('MongoDB query failed, falling back to in-memory storage');
        let filteredHistory = meetingHistory;
        
        if (employeeId) {
          filteredHistory = filteredHistory.filter(h => h.employeeId === employeeId);
        }
        if (leadId) {
          filteredHistory = filteredHistory.filter(h => h.leadId === leadId);
        }
        
        // Apply date filtering for in-memory data
        if (dateRange === 'today') {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
          filteredHistory = filteredHistory.filter(h => {
            const timestamp = new Date(h.timestamp);
            return timestamp >= startOfDay && timestamp < endOfDay;
          });
        } else if (dateRange === 'week') {
          const today = new Date();
          const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
          filteredHistory = filteredHistory.filter(h => new Date(h.timestamp) >= startOfWeek);
        } else if (dateRange === 'month') {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          filteredHistory = filteredHistory.filter(h => new Date(h.timestamp) >= startOfMonth);
        } else if (startDate || endDate) {
          filteredHistory = filteredHistory.filter(h => {
            const timestamp = new Date(h.timestamp);
            if (startDate && timestamp < new Date(startDate as string)) return false;
            if (endDate && timestamp > new Date(endDate as string)) return false;
            return true;
          });
        }
        
        const result = filteredHistory
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 100);
        
        console.log(`Found ${result.length} meeting history entries in memory`);
        return result;
      },
      'fetch meeting history'
    );

    const response: MeetingHistoryResponse = {
      history,
      total: history.length,
      filters: {
        employeeId: employeeId as string,
        leadId: leadId as string,
        dateRange: dateRange as string,
        startDate: startDate as string,
        endDate: endDate as string,
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching meeting history:", error);
    
    // Final fallback
    try {
      const response: MeetingHistoryResponse = {
        history: [],
        total: 0,
        filters: {
          employeeId: req.query.employeeId as string,
          leadId: req.query.leadId as string,
          dateRange: req.query.dateRange as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        },
        error: "Service temporarily unavailable"
      };
      res.json(response);
    } catch (fallbackError) {
      res.status(500).json({ 
        error: "Failed to fetch meeting history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
};

export const addMeetingHistory: RequestHandler = async (req, res) => {
  try {
    const { sessionId, employeeId, meetingDetails, leadId } = req.body;
    const db = Database.getInstance();

    if (!sessionId || !employeeId || !meetingDetails) {
      return res.status(400).json({ 
        error: "Session ID, employee ID, and meeting details are required" 
      });
    }

    const historyId = `history_${String(historyIdCounter++).padStart(3, '0')}`;
    const timestamp = new Date().toISOString();

    const historyData = {
      _id: historyId,
      sessionId,
      employeeId,
      meetingDetails,
      timestamp,
      leadId,
    };

    // Execute with fallback pattern
    const history = await db.executeWithFallback(
      async () => {
        console.log('Adding meeting history to MongoDB...');
        const newHistory = new MeetingHistory(historyData);
        const savedHistory = await newHistory.save();
        
        console.log('Meeting history saved to MongoDB:', savedHistory._id);
        return {
          id: savedHistory._id.toString(),
          sessionId: savedHistory.sessionId,
          employeeId: savedHistory.employeeId,
          meetingDetails: savedHistory.meetingDetails,
          timestamp: savedHistory.timestamp,
          leadId: savedHistory.leadId,
        };
      },
      () => {
        console.log('MongoDB save failed, falling back to in-memory storage');
        const memoryHistory = {
          id: historyId,
          sessionId,
          employeeId,
          meetingDetails,
          timestamp,
          leadId,
        };
        
        meetingHistory.push(memoryHistory);
        console.log('Meeting history saved to memory:', historyId);
        return memoryHistory;
      },
      'add meeting history'
    );

    res.status(201).json(history);
  } catch (error) {
    console.error("Error adding meeting history:", error);
    res.status(500).json({ 
      error: "Failed to add meeting history",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default {
  getTrackingSessions,
  createTrackingSession,
  updateTrackingSessionLocation,
  endTrackingSession,
  getMeetingHistory,
  addMeetingHistory,
};
