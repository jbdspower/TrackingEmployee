import { RequestHandler } from "express";
import axios from "axios";
import NodeCache from "node-cache";
import { TrackingSession } from "../models";
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
  const cacheKey = `${lat?.toFixed(6)},${lng?.toFixed(6)}`;
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


   const address = response.data?.display_name || `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
   console.log("Anish bhai web create address :  ",address);
   geocodeCache.set(cacheKey, address);
   return address;
 } catch (error) {
   console.error('Reverse geocoding failed:', error);
   return `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
 }
}


// Enhanced meeting conversion with address handling
export async function convertMeetingToMeetingLog(meeting: IMeeting): Promise<MeetingLog> {
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
     console.error("MongoDB query failed:", dbError);
     throw dbError; // Fall through to error handler
   }
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
       return res.status(404).json({ error: "Meeting not found" });
     }


     const meetingLog = await convertMeetingToMeetingLog(meeting);
     res.json(meetingLog);
     return;
   } catch (dbError) {
     console.error("MongoDB query failed:", dbError);
     throw dbError;
   }
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
     console.error("MongoDB save failed:", dbError);
     throw dbError;
   }
 } catch (error) {
   console.error("Error creating meeting:", error);
   res.status(500).json({ error: "Failed to create meeting" });
 }
};


export const updateMeeting: RequestHandler = async (req, res) => {
 try {
   const { id } = req.params;
   const updates = req.body;


   if (updates.status === "completed") {
     if (!updates.endTime) {
       updates.endTime = new Date().toISOString();
     }


     // Step 1: Get the existing meeting to preserve location data
     const existingMeeting : any = await Meeting.findById(id);
     if (!existingMeeting) {
       return res.status(404).json({ error: "Meeting not found" });
     }


     // Step 2: Don't replace `location`, just add `endLocation` to it
     console.log("existingMeeting : ", existingMeeting);
     updates.location = {
       ...existingMeeting?.location?.toObject(),
       endLocation: {
         lat: updates.meetingDetails.lat,
         lng: updates.meetingDetails.lng,
         address: await reverseGeocode(updates.meetingDetails.lat, updates.meetingDetails.lng),
         timestamp: updates.endTime,
       },
     };
   }


   // Validate meetingDetails
   if (updates.meetingDetails && !updates.meetingDetails.discussion?.trim()) {
     return res.status(400).json({ error: "Discussion details are required" });
   }


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

