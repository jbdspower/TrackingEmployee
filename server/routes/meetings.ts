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

// 🔹 Helper function to format time for IST display
function formatTimeForIST(utcTime: string): string {
  const date = new Date(utcTime);
  // Return IST formatted time
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// 🔹 Helper function to get current time in IST
function getCurrentTimeIST(): string {
  const now = new Date();
  return now.toISOString(); // Keep UTC in database, format on display
}

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

// export const createMeeting: RequestHandler = async (req, res) => {
//   try {
//     const { employeeId, location, clientName, notes, leadId, leadInfo, followUpId, externalMeetingStatus, startTime } = req.body;

//     if (!employeeId || !location) {
//       return res.status(400).json({ error: "Employee ID and location are required" });
//     }

//     // Get human-readable address
//     const address = await reverseGeocode(location.lat, location.lng);

//     // 🔹 CRITICAL FIX: Store times in UTC, don't convert to IST on server
//     const meetingStartTime = startTime || new Date().toISOString();

//     console.log("📅 Meeting start time (UTC):", {
//       clientProvided: !!startTime,
//       utcTime: meetingStartTime,
//       istDisplay: formatTimeForIST(meetingStartTime),
//       currentUTC: new Date().toISOString(),
//       currentISTDisplay: formatTimeForIST(new Date().toISOString())
//     });

//     const meetingData = {
//       employeeId,
//       location: {
//         ...location,
//         address,
//         timestamp: new Date().toISOString()
//       },
//       startTime: meetingStartTime, // 🔹 Use the exact time when user clicked start
//       clientName,
//       notes,
//       status: "in-progress" as const,
//       leadId: leadId || undefined,
//       leadInfo: leadInfo || undefined,
//       followUpId: followUpId || undefined, // 🔹 Store follow-up meeting ID
//       externalMeetingStatus: externalMeetingStatus || undefined, // 🔹 NEW: Store external meeting status
//     };

//     // Try MongoDB first
//     try {
//       const newMeeting = new Meeting(meetingData);
//       const savedMeeting = await newMeeting.save();
//       const meetingLog = await convertMeetingToMeetingLog(savedMeeting);

//       console.log("✅ Meeting saved to MongoDB:", {
//         id: savedMeeting._id,
//         employeeId: savedMeeting.employeeId,
//         followUpId: savedMeeting.followUpId,
//         status: savedMeeting.status,
//         clientName: savedMeeting.clientName
//       });

//       // 🔹 VERIFICATION: Immediately query to confirm it was saved
//       try {
//         const verification = await Meeting.findById(savedMeeting._id);
//         if (verification) {
//           console.log("✅ VERIFIED: Meeting exists in database");
//           console.log("✅ VERIFIED followUpId:", verification.followUpId);
//           console.log("✅ VERIFIED status:", verification.status);

//           // Also verify we can find it by followUpId
//           if (verification.followUpId) {
//             const byFollowUpId = await Meeting.findOne({ 
//               followUpId: verification.followUpId,
//               status: { $in: ["in-progress", "started"] }
//             });
//             if (byFollowUpId) {
//               console.log("✅ VERIFIED: Can find meeting by followUpId");
//             } else {
//               console.error("❌ VERIFICATION FAILED: Cannot find meeting by followUpId!");
//             }
//           }
//         } else {
//           console.error("❌ VERIFICATION FAILED: Meeting not found after save!");
//         }
//       } catch (verifyError) {
//         console.error("❌ VERIFICATION ERROR:", verifyError);
//       }

//       res.status(201).json(meetingLog);
//       return;
//     } catch (dbError) {
//       console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
//     }

//     // Fallback to in-memory storage
//     const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     const meetingLog: MeetingLog = {
//       id: meetingId,
//       employeeId: meetingData.employeeId,
//       location: meetingData.location,
//       startTime: meetingData.startTime,
//       clientName: meetingData.clientName,
//       notes: meetingData.notes,
//       status: meetingData.status,
//       leadId: meetingData.leadId,
//       leadInfo: meetingData.leadInfo,
//     };

//     inMemoryMeetings.push(meetingLog);

//     console.log("Meeting saved to memory:", meetingId);
//     res.status(201).json(meetingLog);
//   } catch (error) {
//     console.error("Error creating meeting:", error);
//     res.status(500).json({ error: "Failed to create meeting" });
//   }
// };

export const createMeeting: RequestHandler = async (req, res) => {

  console.log("bodyy before try of start:", req.body);

  try {
    const {
      employeeId,
      location,
      clientName,
      notes,
      leadId,
      leadInfo,
      followUpId,
      externalMeetingStatus,
      startTime,
    } = req.body;
    console.log("bodyy of start:", req.body);

    if (!employeeId || !location) {
      return res.status(400).json({ error: "Employee ID and location are required" });
    }

    const address = await reverseGeocode(location.lat, location.lng);

    // 🔒 START TIME — SET ONCE
    const meetingStartTime = startTime ?? new Date().toISOString();
    const sanitizedLeadInfo =
      leadInfo && Object.keys(leadInfo).length > 0 ? leadInfo : undefined;


    const meeting = await Meeting.create({
      employeeId,
      location: {
        ...location,
        address,
        timestamp: new Date().toISOString(),
      },
      startTime: meetingStartTime,
      clientName,
      notes,
      status: "in-progress",
      meetingStatus: "in-progress", // Initialize meetingStatus
      leadId,
      leadInfo: sanitizedLeadInfo || undefined,
      followUpId,
      externalMeetingStatus,
    });

    console.log("✅ START MEETING:", {
      id: meeting._id,
      startTime: meeting.startTime,
    });

    const meetingLog = await convertMeetingToMeetingLog(meeting);
    res.status(201).json(meetingLog);
  } catch (error) {
    console.error("❌ Error starting meeting:", error);
    res.status(500).json({ error: "Failed to start meeting" });
  }
};

export const updateMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let meeting = null;

    // 1️⃣ Try by ID (normal flow)
    if (id && id !== "undefined" && id !== "null") {
      try {
        meeting = await Meeting.findById(id);
        console.log(`🔍 Found meeting by ID: ${id}`, meeting ? "✅" : "❌");
      } catch (error) {
        console.warn(`⚠️ Invalid meeting ID format: ${id}`);
      }
    }

    // 2️⃣ FALLBACK — tab was closed, find active meeting by employeeId
    if (!meeting) {
      const { employeeId, followUpId } = req.body;

      if (!employeeId) {
        return res.status(400).json({ error: "employeeId required to end meeting" });
      }

      console.log(`🔍 Searching for active meeting - employeeId: ${employeeId}, followUpId: ${followUpId}`);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Build query to find active meeting
      const query: any = {
        employeeId,
        status: { $in: ["in-progress", "started"] },
        startTime: { $gte: startOfToday.toISOString() },
      };

      // Add followUpId to query if provided for more specific matching
      if (followUpId) {
        query.followUpId = followUpId;
      }

      // Exclude already completed meetings
      query.$or = [
        { meetingStatus: { $exists: false } },
        { meetingStatus: { $ne: "complete" } }
      ];

      console.log("🔍 Active meeting query:", JSON.stringify(query, null, 2));

      meeting = await Meeting.findOne(query).sort({ startTime: -1 });
      
      if (meeting) {
        console.log(`✅ Found active meeting by fallback search: ${meeting._id}`);
      } else {
        console.log("❌ No active meeting found with fallback search");
        
        // Debug: Check what meetings exist for this employee today
        const allTodayMeetings = await Meeting.find({
          employeeId,
          startTime: { $gte: startOfToday.toISOString() }
        }).lean();
        
        console.log("📋 All meetings for employee today:", allTodayMeetings.map(m => ({
          id: m._id,
          status: m.status,
          meetingStatus: m.meetingStatus,
          followUpId: m.followUpId,
          startTime: m.startTime
        })));
      }
    }

    if (!meeting) {
      return res.status(404).json({ error: "No active meeting found to end" });
    }

    console.log(`📝 Ending meeting: ${meeting._id}`);

    // 🔒 ABSOLUTE PROTECTION - never allow these to be overwritten
    delete updates.startTime;
    delete updates.status;

    // ✅ Set completion status deterministically
    meeting.status = "completed";
    meeting.meetingStatus = "complete";
    meeting.endTime = updates.endTime || new Date().toISOString();

    // Optional fields (only if provided)
    if (updates.meetingDetails) {
      meeting.meetingDetails = updates.meetingDetails;
    }

    if (updates.externalMeetingStatus) {
      meeting.externalMeetingStatus = updates.externalMeetingStatus;
    }

    // 📍 End location (matches your current logic)
    if (updates.endLocation) {
      meeting.location.endLocation = {
        lat: updates.endLocation.lat,
        lng: updates.endLocation.lng,
        address:
          updates.endLocation.address ||
          `${updates.endLocation.lat}, ${updates.endLocation.lng}`,
        timestamp: updates.endLocation.timestamp || new Date().toISOString(),
      };
    }

    // 🔒 FINAL CONSISTENCY GUARANTEE
    if (meeting.status === "completed") {
      meeting.meetingStatus = "complete";
    }

    if (meeting.meetingStatus === "complete") {
      meeting.status = "completed";
    }

    await meeting.save();

    console.log("✅ END MEETING SAVED:", {
      id: meeting._id,
      status: meeting.status,
      meetingStatus: meeting.meetingStatus,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
    });

    const meetingLog = await convertMeetingToMeetingLog(meeting);
    res.status(200).json(meetingLog);
  } catch (error) {
    console.error("❌ Error ending meeting:", error);
    res.status(500).json({ error: "Failed to end meeting" });
  }
};


// export const updateMeeting: RequestHandler = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;

//     console.log(`📝 Updating meeting ${id} with status: ${updates.status}`);
//     console.log(`📍 End location in request:`, updates.endLocation);

//     // 🔹 CRITICAL FIX: Never allow startTime to be overwritten
//     if (updates.startTime) {
//       console.warn("⚠️ Attempt to update startTime blocked - preserving original startTime");
//       delete updates.startTime;
//     }

//     // 🔹 ADDITIONAL PROTECTION: Ensure endTime is never set to startTime for today's meetings
//     if (updates.endTime && updates.status === "completed") {
//       console.log(`📋 Meeting completion - endTime: ${updates.endTime}`);

//       // Validate that endTime is different from startTime (if we can access it)
//       try {
//         const currentMeeting = await Meeting.findById(id).lean();
//         if (currentMeeting && currentMeeting.startTime) {
//           const startTime = new Date(currentMeeting.startTime).getTime();
//           const endTime = new Date(updates.endTime).getTime();
//           const timeDifference = endTime - startTime;

//           console.log(`⏰ Time validation:`, {
//             startTime: currentMeeting.startTime,
//             endTime: updates.endTime,
//             differenceMs: timeDifference,
//             differenceMinutes: Math.round(timeDifference / (1000 * 60))
//           });

//           // For Today's Meetings specifically: ensure endTime is at least 1 minute after startTime
//           if (timeDifference <= 0) {
//             console.error("❌ CRITICAL: End time must be after start time!");
//             updates.endTime = new Date(startTime + 60000).toISOString(); // Add 1 minute minimum
//             console.log(`🔧 FIXED: Adjusted endTime to be 1 minute after startTime: ${updates.endTime}`);
//           } else if (timeDifference < 30000) {
//             // Warn if times are suspiciously close (less than 30 seconds apart)
//             console.warn("⚠️ WARNING: Start and end times are very close together!");
//             console.warn("This might indicate a timing issue in the client or server.");
//           }
//         }
//       } catch (validationError) {
//         console.warn("Could not validate meeting times:", validationError);
//       }
//     }

//     // Log attachments info
//     if (updates.meetingDetails?.attachments) {
//       console.log(`📎 Attachments received: ${updates.meetingDetails.attachments.length} files`);
//       updates.meetingDetails.attachments.forEach((att: string, idx: number) => {
//         const size = att.length;
//         const type = att.match(/data:([^;]+);/)?.[1] || 'unknown';
//         console.log(`   File ${idx + 1}: ${type}, ${(size / 1024).toFixed(2)} KB`);
//       });
//     } else {
//       console.log(`📎 No attachments in request`);
//     }

//     // Handle meeting completion
//     if (updates.status === "completed") {
//       if (!updates.endTime) {
//         // Only set endTime if not provided by client - store in UTC
//         updates.endTime = new Date().toISOString();
//         console.log(`⏰ Setting endTime to current server time (UTC): ${updates.endTime}`);
//         console.log(`⏰ IST display: ${formatTimeForIST(updates.endTime)}`);
//         console.warn(`⚠️ WARNING: Client did not provide endTime, using server time instead`);
//       } else {
//         // Keep client-provided endTime as UTC
//         console.log(`⏰ Using client-provided endTime (UTC): ${updates.endTime}`);
//         console.log(`⏰ IST display: ${formatTimeForIST(updates.endTime)}`);

//         // 🔹 CRITICAL VALIDATION: Ensure endTime is not the same as startTime
//         try {
//           const currentMeeting = await Meeting.findById(id).lean();
//           if (currentMeeting && currentMeeting.startTime) {
//             if (updates.endTime === currentMeeting.startTime) {
//               console.error(`❌ CRITICAL ERROR: Client provided endTime is identical to startTime!`);
//               console.error(`   StartTime: ${currentMeeting.startTime}`);
//               console.error(`   EndTime: ${updates.endTime}`);
//               console.error(`   This will cause the timing issue! Using server time instead.`);

//               // Use server time to prevent the timing issue
//               updates.endTime = new Date().toISOString();
//               console.log(`🔧 FIXED: Using server time instead: ${updates.endTime}`);
//             } else {
//               const startTime = new Date(currentMeeting.startTime).getTime();
//               const endTime = new Date(updates.endTime).getTime();
//               const duration = endTime - startTime;

//               console.log(`✅ VALIDATION PASSED: Times are different`);
//               console.log(`   Duration: ${Math.round(duration / (1000 * 60))} minutes`);
//             }
//           }
//         } catch (validationError) {
//           console.warn("Could not validate meeting times:", validationError);
//         }
//       }
//     }

//     // Validate meeting details
//     if (updates.meetingDetails && !updates.meetingDetails.discussion?.trim()) {
//       return res.status(400).json({ error: "Discussion details are required" });
//     }

//     // 🔹 CRITICAL FIX: Capture end location when meeting is completed
//     if (updates.status === "completed" && updates.endLocation) {
//       console.log("📍 Capturing end location for meeting:", JSON.stringify(updates.endLocation, null, 2));
//       // Store end location in the location.endLocation field
//       updates["location.endLocation"] = {
//         lat: updates.endLocation.lat,
//         lng: updates.endLocation.lng,
//         address: updates.endLocation.address || `${updates.endLocation.lat.toFixed(6)}, ${updates.endLocation.lng.toFixed(6)}`,
//         timestamp: updates.endLocation.timestamp || new Date().toISOString(),
//       };
//       console.log("✅ End location formatted:", JSON.stringify(updates["location.endLocation"], null, 2));
//       // Remove the top-level endLocation field as it's now nested
//       delete updates.endLocation;
//     } else if (updates.status === "completed") {
//       console.warn("⚠️ Meeting completed but no endLocation provided in request!");
//     }

//     // Try MongoDB first
//     try {
//       // 🔹 VERIFICATION: Get the current meeting data before update
//       const currentMeeting = await Meeting.findById(id);
//       if (!currentMeeting) {
//         return res.status(404).json({ error: "Meeting not found in database" });
//       }

//       console.log("📋 Current meeting before update:", {
//         id: currentMeeting._id,
//         startTime: currentMeeting.startTime,
//         endTime: currentMeeting.endTime,
//         status: currentMeeting.status,
//         clientName: currentMeeting.clientName
//       });

//       const updatedMeeting = await Meeting.findByIdAndUpdate(
//         id,
//         { $set: updates },
//         { new: true, runValidators: true }
//       );

//       if (!updatedMeeting) {
//         return res.status(404).json({ error: "Meeting not found in database" });
//       }

//       console.log("📋 Meeting after update:", {
//         id: updatedMeeting._id,
//         startTime: updatedMeeting.startTime,
//         endTime: updatedMeeting.endTime,
//         status: updatedMeeting.status,
//         clientName: updatedMeeting.clientName
//       });

//       // 🔹 VERIFICATION: Ensure startTime was not changed
//       if (currentMeeting.startTime !== updatedMeeting.startTime) {
//         console.error("❌ CRITICAL ERROR: startTime was changed during update!");
//         console.error("Original startTime:", currentMeeting.startTime);
//         console.error("New startTime:", updatedMeeting.startTime);
//       } else {
//         console.log("✅ VERIFIED: startTime preserved correctly");
//       }

//       console.log("Meeting updated in MongoDB:", updatedMeeting._id);
//       if (updatedMeeting.location?.endLocation) {
//         console.log("✅ End location saved:", updatedMeeting.location.endLocation);
//       }

//       // Log attachments storage
//       if (updatedMeeting.meetingDetails?.attachments) {
//         console.log(`✅ Attachments stored: ${updatedMeeting.meetingDetails.attachments.length} files`);
//       } else {
//         console.log(`⚠️ No attachments in stored meeting`);
//       }

//       const meetingLog = await convertMeetingToMeetingLog(updatedMeeting);

//       // Verify attachments in response
//       if (meetingLog.meetingDetails?.attachments) {
//         console.log(`✅ Attachments in response: ${meetingLog.meetingDetails.attachments.length} files`);
//       } else {
//         console.log(`⚠️ No attachments in response`);
//       }

//       res.json(meetingLog);
//       return;
//     } catch (dbError) {
//       console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
//     }

//     // Fallback to in-memory storage
//     const meetingIndex = inMemoryMeetings.findIndex((meeting) => meeting.id === id);
//     if (meetingIndex === -1) {
//       return res.status(404).json({ error: "Meeting not found" });
//     }

//     inMemoryMeetings[meetingIndex] = {
//       ...inMemoryMeetings[meetingIndex],
//       ...updates,
//     };

//     console.log("Meeting updated in memory:", id);
//     res.json(inMemoryMeetings[meetingIndex]);
//   } catch (error) {
//     console.error("Error updating meeting:", error);
//     res.status(500).json({ error: "Failed to update meeting" });
//   }
// };

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
        status: { $in: ["in-progress", "started"] },
        $or: [
          { meetingStatus: { $exists: false } },
          { meetingStatus: { $ne: "complete" } }
        ]
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
        let allMeetings: any[] = [];
        if (employeeId) {
          allMeetings = await Meeting.find({ employeeId }).lean();
          console.log("📋 All meetings for employee:", allMeetings.map(m => ({
            id: m._id,
            status: m.status,
            followUpId: m.followUpId,
            startTime: m.startTime
          })));
        }

        // 🔹 DEBUG: Check if there are ANY active meetings
        const anyActiveMeetings = await Meeting.find({
          status: { $in: ["in-progress", "started"] },
          $or: [
            { meetingStatus: { $exists: false } },
            { meetingStatus: { $ne: "complete" } }
          ]
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
    if (!approvalStatus || !['ok', 'not_ok', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ error: "Valid approval status (ok/not_ok or pending) is required" });
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

    if (!approvalStatus || !['ok', 'not_ok', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ error: "Valid approval status (ok/not_ok or pending) is required" });
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
          $lte: endOfDayDate.toISOString(),
        },
        meetingStatus: { $ne: "complete" }
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
