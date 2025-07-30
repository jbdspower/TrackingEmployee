import { RequestHandler } from "express";
import { Meeting, MeetingHistory } from "../models";

export const debugEmployeeData: RequestHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`Debugging data for employee: ${employeeId}`);
    
    // Get MongoDB meetings
    const mongoMeetings = await Meeting.find({ employeeId }).lean();
    console.log(`Found ${mongoMeetings.length} meetings in MongoDB for employee ${employeeId}`);
    
    // Get MongoDB meeting history
    const mongoHistory = await MeetingHistory.find({ employeeId }).lean();
    console.log(`Found ${mongoHistory.length} history entries in MongoDB for employee ${employeeId}`);
    
    // Get in-memory meetings
    const { meetings: inMemoryMeetings } = await import("./meetings");
    const filteredInMemory = inMemoryMeetings.filter(m => m.employeeId === employeeId);
    console.log(`Found ${filteredInMemory.length} meetings in memory for employee ${employeeId}`);
    
    const debugData = {
      employeeId,
      mongoDB: {
        meetings: {
          count: mongoMeetings.length,
          data: mongoMeetings.map(m => ({
            id: m._id.toString(),
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            clientName: m.clientName,
            leadId: m.leadId,
            hasDetails: !!m.meetingDetails,
            detailsCustomers: m.meetingDetails?.customers?.length || 0
          }))
        },
        history: {
          count: mongoHistory.length,
          data: mongoHistory.map(h => ({
            id: h._id.toString(),
            timestamp: h.timestamp,
            sessionId: h.sessionId,
            leadId: h.leadId,
            hasDetails: !!h.meetingDetails,
            discussion: h.meetingDetails?.discussion?.substring(0, 100),
            customers: h.meetingDetails?.customers?.length || 0,
            customerNames: h.meetingDetails?.customers?.map(c => c.customerEmployeeName) || []
          }))
        }
      },
      inMemory: {
        meetings: {
          count: filteredInMemory.length,
          data: filteredInMemory.map(m => ({
            id: m.id,
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            clientName: m.clientName,
            leadId: m.leadId,
            hasDetails: !!m.meetingDetails
          }))
        }
      },
      recommendations: []
    };
    
    // Add recommendations based on data analysis
    if (mongoMeetings.length === 0 && filteredInMemory.length > 0) {
      debugData.recommendations.push("Meetings exist in memory but not in MongoDB - run data sync");
    }
    
    if (mongoMeetings.length > mongoHistory.length) {
      debugData.recommendations.push("More meetings than history entries - some meetings may not have been completed properly");
    }
    
    if (mongoHistory.length === 0) {
      debugData.recommendations.push("No meeting history found - check if meetings are being ended with proper details");
    }
    
    console.log("Debug data prepared:", JSON.stringify(debugData, null, 2));
    
    res.json(debugData);
    
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ error: "Debug failed", details: error.message });
  }
};
