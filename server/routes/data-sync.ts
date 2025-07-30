import { RequestHandler } from "express";
import { Meeting, MeetingHistory, Employee, TrackingSession } from "../models";

// Endpoint to synchronize all data sources and ensure consistency
export const syncAllData: RequestHandler = async (req, res) => {
  try {
    console.log("Starting data synchronization...");
    
    const { employeeId } = req.query;
    
    // Get all data from MongoDB
    const mongoMeetings = await Meeting.find(employeeId ? { employeeId } : {}).lean();
    const mongoHistory = await MeetingHistory.find(employeeId ? { employeeId } : {}).lean();
    
    console.log(`Found ${mongoMeetings.length} meetings and ${mongoHistory.length} history entries in MongoDB`);
    
    // Get in-memory data for comparison
    const { meetings: inMemoryMeetings } = await import("./meetings");
    
    console.log(`Found ${inMemoryMeetings.length} meetings in memory`);
    
    // Synchronize missing data
    let syncedMeetings = 0;
    let syncedHistory = 0;
    
    // Sync in-memory meetings to MongoDB
    for (const meeting of inMemoryMeetings) {
      if (employeeId && meeting.employeeId !== employeeId) continue;
      
      const exists = await Meeting.findOne({ 
        employeeId: meeting.employeeId,
        startTime: meeting.startTime 
      });
      
      if (!exists) {
        try {
          const newMeeting = new Meeting({
            employeeId: meeting.employeeId,
            location: meeting.location,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            clientName: meeting.clientName,
            notes: meeting.notes,
            status: meeting.status,
            trackingSessionId: meeting.trackingSessionId,
            leadId: meeting.leadId,
            leadInfo: meeting.leadInfo,
            meetingDetails: meeting.meetingDetails
          });
          
          await newMeeting.save();
          syncedMeetings++;
          
          // Also add to meeting history if completed
          if (meeting.status === 'completed' && meeting.meetingDetails) {
            const historyExists = await MeetingHistory.findOne({
              employeeId: meeting.employeeId,
              'meetingDetails.discussion': meeting.meetingDetails.discussion
            });
            
            if (!historyExists) {
              const newHistory = new MeetingHistory({
                sessionId: meeting.trackingSessionId || `sync_${Date.now()}`,
                employeeId: meeting.employeeId,
                meetingDetails: meeting.meetingDetails,
                timestamp: meeting.endTime || meeting.startTime,
                leadId: meeting.leadId,
                leadInfo: meeting.leadInfo
              });
              
              await newHistory.save();
              syncedHistory++;
            }
          }
        } catch (syncError) {
          console.warn(`Failed to sync meeting ${meeting.id}:`, syncError);
        }
      }
    }
    
    // Get final counts
    const finalMeetings = await Meeting.countDocuments(employeeId ? { employeeId } : {});
    const finalHistory = await MeetingHistory.countDocuments(employeeId ? { employeeId } : {});
    
    const result = {
      success: true,
      message: "Data synchronization completed",
      stats: {
        totalMeetingsInMongoDB: finalMeetings,
        totalHistoryInMongoDB: finalHistory,
        meetingsSynced: syncedMeetings,
        historySynced: syncedHistory,
        employeeId: employeeId || "all"
      }
    };
    
    console.log("Data sync result:", result);
    res.json(result);
    
  } catch (error) {
    console.error("Error synchronizing data:", error);
    res.status(500).json({ 
      error: "Failed to synchronize data",
      details: error.message 
    });
  }
};

// Endpoint to get comprehensive data status
export const getDataStatus: RequestHandler = async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    // MongoDB counts
    const mongoMeetingsCount = await Meeting.countDocuments(employeeId ? { employeeId } : {});
    const mongoHistoryCount = await MeetingHistory.countDocuments(employeeId ? { employeeId } : {});
    const mongoEmployeesCount = await Employee.countDocuments();
    const mongoTrackingCount = await TrackingSession.countDocuments(employeeId ? { employeeId } : {});
    
    // In-memory counts
    const { meetings: inMemoryMeetings } = await import("./meetings");
    const filteredInMemoryMeetings = employeeId 
      ? inMemoryMeetings.filter(m => m.employeeId === employeeId)
      : inMemoryMeetings;
    
    // Sample data for debugging
    const sampleMongoMeeting = await Meeting.findOne(employeeId ? { employeeId } : {}).lean();
    const sampleMongoHistory = await MeetingHistory.findOne(employeeId ? { employeeId } : {}).lean();
    
    const status = {
      employeeId: employeeId || "all",
      mongoDB: {
        meetings: mongoMeetingsCount,
        history: mongoHistoryCount,
        employees: mongoEmployeesCount,
        trackingSessions: mongoTrackingCount,
        sampleMeeting: sampleMongoMeeting ? {
          id: sampleMongoMeeting._id,
          employeeId: sampleMongoMeeting.employeeId,
          status: sampleMongoMeeting.status,
          hasDetails: !!sampleMongoMeeting.meetingDetails,
          leadId: sampleMongoMeeting.leadId
        } : null,
        sampleHistory: sampleMongoHistory ? {
          id: sampleMongoHistory._id,
          employeeId: sampleMongoHistory.employeeId,
          hasCustomers: sampleMongoHistory.meetingDetails?.customers?.length > 0,
          discussion: sampleMongoHistory.meetingDetails?.discussion?.substring(0, 100)
        } : null
      },
      inMemory: {
        meetings: filteredInMemoryMeetings.length,
        sampleMeeting: filteredInMemoryMeetings[0] ? {
          id: filteredInMemoryMeetings[0].id,
          employeeId: filteredInMemoryMeetings[0].employeeId,
          status: filteredInMemoryMeetings[0].status,
          hasDetails: !!filteredInMemoryMeetings[0].meetingDetails
        } : null
      }
    };
    
    res.json(status);
    
  } catch (error) {
    console.error("Error getting data status:", error);
    res.status(500).json({ 
      error: "Failed to get data status",
      details: error.message 
    });
  }
};
