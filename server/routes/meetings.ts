import { RequestHandler } from "express";
import {
  MeetingLog,
  MeetingLogsResponse,
  CreateMeetingRequest,
} from "@shared/api";
import { Meeting, IMeeting } from "../models";

// Legacy in-memory storage for backward compatibility (if database fails)
export let meetings: MeetingLog[] = [];

let meetingIdCounter = 1;

// Helper function to convert MongoDB document to MeetingLog
function convertMeetingToMeetingLog(meeting: IMeeting): MeetingLog {
  return {
    id: meeting._id.toString(),
    employeeId: meeting.employeeId,
    location: meeting.location,
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

    console.log("Fetching meetings with query:", query);

    // Try to fetch from MongoDB first
    try {
      const mongoMeetings = await Meeting.find(query)
        .sort({ startTime: -1 })
        .limit(parseInt(limit as string))
        .lean();

      const meetingLogs = mongoMeetings.map(convertMeetingToMeetingLog);

      const response: MeetingLogsResponse = {
        meetings: meetingLogs,
        total: meetingLogs.length,
      };

      console.log(`Found ${meetingLogs.length} meetings in MongoDB`);
      res.json(response);
      return;
    } catch (dbError) {
      console.warn("MongoDB query failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    let filteredMeetings = meetings;

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
        (meeting) =>
          new Date(meeting.startTime) >= new Date(startDate as string),
      );
    }

    if (endDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => new Date(meeting.startTime) <= new Date(endDate as string),
      );
    }

    filteredMeetings.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

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

export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const { employeeId, location, clientName, notes, leadId, leadInfo } =
      req.body;

    if (!employeeId || !location) {
      return res.status(400).json({
        error: "Employee ID and location are required",
      });
    }

    console.log("Creating meeting with lead info:", { leadId, leadInfo });

    const meetingData = {
      employeeId,
      location: {
        ...location,
        timestamp: new Date().toISOString(),
      },
      startTime: new Date().toISOString(),
      clientName,
      notes,
      status: "in-progress" as const,
      leadId: leadId || undefined,
      leadInfo: leadInfo || undefined,
    };

    // Try to save to MongoDB first
    try {
      const newMeeting = new Meeting(meetingData);
      const savedMeeting = await newMeeting.save();

      const meetingLog = convertMeetingToMeetingLog(savedMeeting);
      console.log("Meeting saved to MongoDB:", meetingLog.id);
      res.status(201).json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB save failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const newMeeting: MeetingLog = {
      id: `meeting_${String(meetingIdCounter++).padStart(3, "0")}`,
      ...meetingData,
    };

    meetings.push(newMeeting);
    console.log("Meeting saved to memory:", newMeeting.id);
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const updateMeeting: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If ending the meeting, set end time
    if (updates.status === "completed" && !updates.endTime) {
      updates.endTime = new Date().toISOString();
    }

    // Validate meeting details if provided
    if (updates.meetingDetails) {
      if (
        !updates.meetingDetails.discussion ||
        !updates.meetingDetails.discussion.trim()
      ) {
        return res
          .status(400)
          .json({ error: "Discussion details are required" });
      }
    }

    // Try to update in MongoDB first
    try {
      const updatedMeeting = await Meeting.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedMeeting) {
        return res.status(404).json({ error: "Meeting not found in database" });
      }

      const meetingLog = convertMeetingToMeetingLog(updatedMeeting);
      console.log("Meeting updated in MongoDB:", meetingLog.id);
      res.json(meetingLog);
      return;
    } catch (dbError) {
      console.warn("MongoDB update failed, falling back to in-memory storage:", dbError);
    }

    // Fallback to in-memory storage
    const meetingIndex = meetings.findIndex((meeting) => meeting.id === id);
    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meetings[meetingIndex] = {
      ...meetings[meetingIndex],
      ...updates,
    };

    console.log("Meeting updated in memory:", meetings[meetingIndex].id);
    res.json(meetings[meetingIndex]);
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

export const getMeeting: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const meeting = meetings.find((meeting) => meeting.id === id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

export const deleteMeeting: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const meetingIndex = meetings.findIndex((meeting) => meeting.id === id);

    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meetings.splice(meetingIndex, 1);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};
