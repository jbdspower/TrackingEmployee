import { RequestHandler } from "express";
import axios from 'axios';
import NodeCache from 'node-cache';
import {
  MeetingLog,
  MeetingLogsResponse,
  CreateMeetingRequest,
} from "@shared/api";
import { Meeting, IMeeting } from "../models";

// Initialize cache with 1 hour TTL
const geocodeCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Helper function for reverse geocoding
// Rate limiting for Nominatim API (max 1 request per second)
let lastGeocodingTime = 0;
const GEOCODING_DELAY = 1000; // 1 second

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return "Location not available";
  
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cachedAddress = geocodeCache.get<string>(cacheKey);
  if (cachedAddress) {
    console.log(`✅ Using cached address for ${lat}, ${lng}: ${cachedAddress}`);
    return cachedAddress;
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
      timeout: 5000
    });

    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    console.log(`✅ Address resolved: ${address}`);
    geocodeCache.set(cacheKey, address);
    return address;
  } catch (error) {
    console.error(`⚠️ Reverse geocoding failed for ${lat}, ${lng}:`, error.message);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Enhanced meeting conversion with address handling
async function convertMeetingToMeetingLog(meeting: IMeeting): Promise<MeetingLog> {
  const location = meeting.location;
  const address = await reverseGeocode(location.lat, location.lng);

  return {
    id: meeting._id.toString(),
    employeeId: meeting.employeeId,
    location: {
      ...location,
      address // Use the geocoded address
    },
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    clientName: meeting.clientName,
    notes: meeting.notes,
    status: meeting.status as "started" | "in-progress" | "completed",
    trackingSessionId: meeting.trackingSessionId,
    leadId: meeting.leadId,
    leadInfo: meeting.leadInfo,
    followUpId: meeting.followUpId, // 🔹 Include follow-up ID
    meetingDetails: meeting.meetingDetails,
    approvalStatus: meeting.approvalStatus, // Meeting approval status
    approvalReason: meeting.approvalReason, // Meeting approval reason
    approvedBy: meeting.approvedBy, // User ID who approved the meeting
  };
}

// In-memory fallback storage
let inMemoryMeetings: MeetingLog[] = [];

// Export for analytics fallback
export { inMemoryMeetings };

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

    console.log("📥 Fetching meetings with query:", JSON.stringify(query, null, 2));

    // Try MongoDB first
    try {
      // 🔹 DEBUG: Count total meetings for this employee
      if (employeeId) {
        const totalCount = await Meeting.countDocuments({ employeeId });
        console.log(`📊 Total meetings in DB for employee ${employeeId}:`, totalCount);
      }
      
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

      console.log(`✅ Found ${meetingLogs.length} meetings matching query:`, 
        meetingLogs.map(m => ({ id: m.id, status: m.status, followUpId: m.followUpId, client: m.clientName }))
      );
      
      // 🔹 DEBUG: If no meetings found but we expected some
      if (meetingLogs.length === 0 && employeeId) {
        console.warn("⚠️ No meetings found for query, checking all statuses...");
        const allMeetings = await Meeting.find({ employeeId }).lean();
        console.log("📋 All meetings for this employee:", 
          allMeetings.map(m => ({ id: m._id, status: m.status, followUpId: m.followUpId }))
        );
      }
      
      res.json(response);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
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

    if (startDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => new Date(meeting.startTime) >= new Date(startDate as string),
      );
    }

    if (endDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => new Date(meeting.startTime) <= new Date(endDate as string),
      );
    }

    filteredMeetings.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    if (limit) {
      filteredMeetings = filteredMeetings.slice(0, parseInt(limit as string));
    }

    const response: MeetingLogsResponse = {
      meetings: filteredMeetings,
      total: filteredMeetings.length,
    };

    console.log(`Found ${filteredMeetings.length} meetings in memory`);
    res.json(response);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

export const getMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Try MongoDB first
    try {
      const meeting = await Meeting.findById(id).lean();
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found in database" });
      }

      const meetingLog = await convertMeetingToMeetingLog(meeting);
      console.log("Meeting found in MongoDB:", meeting._id);
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meeting = inMemoryMeetings.find((meeting) => meeting.id === id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    console.log("Meeting found in memory:", meeting.id);
    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const { employeeId, location, clientName, notes, leadId, leadInfo, followUpId, externalMeetingStatus } = req.body;

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
      followUpId: followUpId || undefined, // 🔹 Store follow-up meeting ID
      externalMeetingStatus: externalMeetingStatus || undefined, // 🔹 NEW: Store external meeting status
    };

    // Try MongoDB first
    try {
      const newMeeting = new Meeting(meetingData);
      const savedMeeting = await newMeeting.save();
      const meetingLog = await convertMeetingToMeetingLog(savedMeeting);

      console.log("✅ Meeting saved to MongoDB:", {
        id: savedMeeting._id,
        employeeId: savedMeeting.employeeId,
        followUpId: savedMeeting.followUpId,
        status: savedMeeting.status,
        clientName: savedMeeting.clientName
      });
      
      // 🔹 VERIFICATION: Immediately query to confirm it was saved
      try {
        const verification = await Meeting.findById(savedMeeting._id);
        if (verification) {
          console.log("✅ VERIFIED: Meeting exists in database");
          console.log("✅ VERIFIED followUpId:", verification.followUpId);
          console.log("✅ VERIFIED status:", verification.status);
          
          // Also verify we can find it by followUpId
          if (verification.followUpId) {
            const byFollowUpId = await Meeting.findOne({ 
              followUpId: verification.followUpId,
              status: { $in: ["in-progress", "started"] }
            });
            if (byFollowUpId) {
              console.log("✅ VERIFIED: Can find meeting by followUpId");
            } else {
              console.error("❌ VERIFICATION FAILED: Cannot find meeting by followUpId!");
            }
          }
        } else {
          console.error("❌ VERIFICATION FAILED: Meeting not found after save!");
        }
      } catch (verifyError) {
        console.error("❌ VERIFICATION ERROR:", verifyError);
      }
      
      res.status(201).json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const meetingLog: MeetingLog = {
      id: meetingId,
      employeeId: meetingData.employeeId,
      location: meetingData.location,
      startTime: meetingData.startTime,
      clientName: meetingData.clientName,
      notes: meetingData.notes,
      status: meetingData.status,
      leadId: meetingData.leadId,
      leadInfo: meetingData.leadInfo,
    };

    inMemoryMeetings.push(meetingLog);

    console.log("Meeting saved to memory:", meetingId);
    res.status(201).json(meetingLog);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const updateMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`📝 Updating meeting ${id} with status: ${updates.status}`);
    console.log(`📍 End location in request:`, updates.endLocation);
    
    // Log attachments info
    if (updates.meetingDetails?.attachments) {
      console.log(`📎 Attachments received: ${updates.meetingDetails.attachments.length} files`);
      updates.meetingDetails.attachments.forEach((att: string, idx: number) => {
        const size = att.length;
        const type = att.match(/data:([^;]+);/)?.[1] || 'unknown';
        console.log(`   File ${idx + 1}: ${type}, ${(size / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log(`📎 No attachments in request`);
    }

    // Handle meeting completion
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = new Date().toISOString();
    }

    // Validate meeting details
    if (updates.meetingDetails && !updates.meetingDetails.discussion?.trim()) {
      return res.status(400).json({ error: "Discussion details are required" });
    }

    // 🔹 CRITICAL FIX: Capture end location when meeting is completed
    if (updates.status === "completed" && updates.endLocation) {
      console.log("📍 Capturing end location for meeting:", JSON.stringify(updates.endLocation, null, 2));
      // Store end location in the location.endLocation field
      updates["location.endLocation"] = {
        lat: updates.endLocation.lat,
        lng: updates.endLocation.lng,
        address: updates.endLocation.address || `${updates.endLocation.lat.toFixed(6)}, ${updates.endLocation.lng.toFixed(6)}`,
        timestamp: updates.endLocation.timestamp || new Date().toISOString(),
      };
      console.log("✅ End location formatted:", JSON.stringify(updates["location.endLocation"], null, 2));
      // Remove the top-level endLocation field as it's now nested
      delete updates.endLocation;
    } else if (updates.status === "completed") {
      console.warn("⚠️ Meeting completed but no endLocation provided in request!");
    }

    // Try MongoDB first
    try {
      const updatedMeeting = await Meeting.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedMeeting) {
        return res.status(404).json({ error: "Meeting not found in database" });
      }

      console.log("Meeting updated in MongoDB:", updatedMeeting._id);
      if (updatedMeeting.location?.endLocation) {
        console.log("✅ End location saved:", updatedMeeting.location.endLocation);
      }
      
      // Log attachments storage
      if (updatedMeeting.meetingDetails?.attachments) {
        console.log(`✅ Attachments stored: ${updatedMeeting.meetingDetails.attachments.length} files`);
      } else {
        console.log(`⚠️ No attachments in stored meeting`);
      }
      
      const meetingLog = await convertMeetingToMeetingLog(updatedMeeting);
      
      // Verify attachments in response
      if (meetingLog.meetingDetails?.attachments) {
        console.log(`✅ Attachments in response: ${meetingLog.meetingDetails.attachments.length} files`);
      } else {
        console.log(`⚠️ No attachments in response`);
      }
      
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meetingIndex = inMemoryMeetings.findIndex((meeting) => meeting.id === id);
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
      console.error("MongoDB delete failed:", dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

// 🔹 NEW ENDPOINT: Get active meeting for employee (by employeeId or followUpId)
export const getActiveMeeting: RequestHandler = async (req, res) => {
  try {
    const { employeeId, followUpId } = req.query;

    if (!employeeId && !followUpId) {
      return res.status(400).json({ 
        error: "Either employeeId or followUpId is required" 
      });
    }

    console.log("🔍 Searching for active meeting:", { employeeId, followUpId });

    // Try MongoDB first
    try {
      // Build query to find active meetings
      const query: any = {
        status: { $in: ["in-progress", "started"] }
      };

      if (followUpId) {
        // If followUpId is provided, search by it (most specific)
        query.followUpId = followUpId;
      } else if (employeeId) {
        // Otherwise search by employeeId
        query.employeeId = employeeId;
      }

      console.log("📥 Query:", JSON.stringify(query, null, 2));

      const activeMeeting = await Meeting.findOne(query)
        .sort({ startTime: -1 }) // Get the most recent one
        .lean();

      if (!activeMeeting) {
        console.log("⚠️ No active meeting found with query:", JSON.stringify(query, null, 2));
        
        // 🔹 DEBUG: Check what meetings exist for this employee
        if (employeeId) {
          const allMeetings = await Meeting.find({ employeeId }).lean();
          console.log("📋 All meetings for employee:", allMeetings.map(m => ({
            id: m._id,
            status: m.status,
            followUpId: m.followUpId,
            startTime: m.startTime
          })));
        }
        
        // 🔹 DEBUG: Check if there are ANY active meetings
        const anyActiveMeetings = await Meeting.find({ 
          status: { $in: ["in-progress", "started"] } 
        }).lean();
        console.log("📋 All active meetings in database:", anyActiveMeetings.map(m => ({
          id: m._id,
          employeeId: m.employeeId,
          followUpId: m.followUpId,
          status: m.status
        })));
        
        return res.status(404).json({ 
          error: "No active meeting found",
          employeeId,
          followUpId,
          debug: {
            totalMeetingsForEmployee: allMeetings?.length || 0,
            totalActiveMeetings: anyActiveMeetings?.length || 0
          }
        });
      }

      const meetingLog = await convertMeetingToMeetingLog(activeMeeting);
      console.log("✅ Active meeting found:", {
        id: meetingLog.id,
        followUpId: meetingLog.followUpId,
        status: meetingLog.status,
        client: meetingLog.clientName
      });

      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.error("MongoDB query failed:", dbError);
      return res.status(500).json({ error: "Database query failed" });
    }
  } catch (error) {
    console.error("Error getting active meeting:", error);
    res.status(500).json({ error: "Failed to get active meeting" });
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

// Update meeting approval status
export const updateMeetingApproval: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, approvalReason, approvedBy } = req.body;

    // Validate inputs
    if (!approvalStatus || !['ok', 'not_ok'].includes(approvalStatus)) {
      return res.status(400).json({ error: "Valid approval status (ok/not_ok) is required" });
    }

    if (!approvalReason || !approvalReason.trim()) {
      return res.status(400).json({ error: "Approval reason is required" });
    }

    console.log(`📝 Updating meeting approval ${id}:`, { approvalStatus, approvalReason, approvedBy });
    console.log(`📝 approvedBy value type:`, typeof approvedBy, `value:`, approvedBy);

    try {
      const updateData = { 
        approvalStatus, 
        approvalReason: approvalReason.trim(),
        approvedBy: approvedBy !== undefined ? approvedBy : null
      };
      
      console.log(`📝 Update data being sent to MongoDB:`, updateData);

      const updatedMeeting = await Meeting.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedMeeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      console.log("✅ Meeting approval updated:", updatedMeeting._id);
      console.log("✅ Approved by user ID stored in DB:", updatedMeeting.approvedBy);
      console.log("✅ Full updated meeting:", JSON.stringify({
        id: updatedMeeting._id,
        approvalStatus: updatedMeeting.approvalStatus,
        approvalReason: updatedMeeting.approvalReason,
        approvedBy: updatedMeeting.approvedBy
      }));
      
      const meetingLog = await convertMeetingToMeetingLog(updatedMeeting);
      res.json({ 
        success: true, 
        meeting: meetingLog,
        approvalStatus: updatedMeeting.approvalStatus,
        approvalReason: updatedMeeting.approvalReason,
        approvedBy: updatedMeeting.approvedBy
      });
    } catch (dbError) {
      console.error("MongoDB update failed:", dbError);
      res.status(500).json({ error: "Failed to update meeting approval" });
    }
  } catch (error) {
    console.error("Error updating meeting approval:", error);
    res.status(500).json({ error: "Failed to update meeting approval" });
  }
};

// Update meeting approval by composite details (when meetingId is not available)
export const updateMeetingApprovalByDetails: RequestHandler = async (req, res) => {
  try {
    const { employeeId, date, companyName, meetingInTime, approvalStatus, approvalReason, approvedBy } = req.body;

    // Validate inputs
    if (!employeeId || !date || !companyName || !meetingInTime) {
      return res.status(400).json({ error: "Employee ID, date, company name, and meeting time are required" });
    }

    if (!approvalStatus || !['ok', 'not_ok'].includes(approvalStatus)) {
      return res.status(400).json({ error: "Valid approval status (ok/not_ok) is required" });
    }

    if (!approvalReason || !approvalReason.trim()) {
      return res.status(400).json({ error: "Approval reason is required" });
    }

    console.log(`📝 Updating meeting approval by details:`, { 
      employeeId, 
      date, 
      companyName, 
      meetingInTime,
      approvalStatus, 
      approvalReason,
      approvedBy
    });

    try {
      // Parse the date and time to create a date range for the query
      const startOfDayDate = new Date(date);
      startOfDayDate.setHours(0, 0, 0, 0);
      
      const endOfDayDate = new Date(date);
      endOfDayDate.setHours(23, 59, 59, 999);

      // Find the meeting by composite details
      const meeting = await Meeting.findOne({
        employeeId: employeeId,
        clientName: companyName,
        startTime: {
          $gte: startOfDayDate.toISOString(),
          $lte: endOfDayDate.toISOString()
        }
      }).lean();

      if (!meeting) {
        console.error("❌ Meeting not found with details:", { employeeId, date, companyName });
        return res.status(404).json({ 
          error: "Meeting not found",
          details: { employeeId, date, companyName, meetingInTime }
        });
      }

      console.log(`✅ Found meeting by details: ${meeting._id}`);
      console.log(`📝 approvedBy value type:`, typeof approvedBy, `value:`, approvedBy);

      const updateData = { 
        approvalStatus, 
        approvalReason: approvalReason.trim(),
        approvedBy: approvedBy !== undefined ? approvedBy : null
      };
      
      console.log(`📝 Update data being sent to MongoDB:`, updateData);

      // Update the meeting
      const updatedMeeting = await Meeting.findByIdAndUpdate(
        meeting._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedMeeting) {
        return res.status(404).json({ error: "Failed to update meeting" });
      }

      console.log("✅ Meeting approval updated by details:", updatedMeeting._id);
      console.log("✅ Approved by user ID stored in DB:", updatedMeeting.approvedBy);
      console.log("✅ Full updated meeting:", JSON.stringify({
        id: updatedMeeting._id,
        approvalStatus: updatedMeeting.approvalStatus,
        approvalReason: updatedMeeting.approvalReason,
        approvedBy: updatedMeeting.approvedBy
      }));
      
      const meetingLog = await convertMeetingToMeetingLog(updatedMeeting);
      res.json({ 
        success: true, 
        meeting: meetingLog,
        approvalStatus: updatedMeeting.approvalStatus,
        approvalReason: updatedMeeting.approvalReason,
        approvedBy: updatedMeeting.approvedBy
      });
    } catch (dbError) {
      console.error("MongoDB update failed:", dbError);
      res.status(500).json({ error: "Failed to update meeting approval" });
    }
  } catch (error) {
    console.error("Error updating meeting approval by details:", error);
    res.status(500).json({ error: "Failed to update meeting approval" });
  }
};
