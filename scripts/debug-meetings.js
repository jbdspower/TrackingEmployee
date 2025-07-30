import mongoose from 'mongoose';

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://harsh:harshit8299@cluster0.lkwrf.mongodb.net/employee-tracking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Meeting History Schema (same as in models)
const meetingHistorySchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  employeeId: { type: String, required: true, index: true },
  meetingDetails: {
    customers: [{
      customerName: String,
      customerEmployeeName: String,
      customerEmail: String,
      customerMobile: String,
      customerDesignation: String,
      customerDepartment: String,
    }],
    // Legacy fields for backward compatibility
    customerName: String,
    customerEmployeeName: String,
    customerEmail: String,
    customerMobile: String,
    customerDesignation: String,
    customerDepartment: String,
    discussion: { type: String, required: true }
  },
  timestamp: { type: String, required: true, index: true },
  leadId: String,
  leadInfo: {
    id: String,
    companyName: String,
    contactName: String
  }
}, {
  timestamps: true
});

const MeetingHistory = mongoose.model('MeetingHistory', meetingHistorySchema);

const debugMeetings = async () => {
  await connectDB();
  
  try {
    console.log("=== MEETING HISTORY DEBUG ===");
    
    // Count total meetings
    const totalMeetings = await MeetingHistory.countDocuments();
    console.log(`Total meetings in database: ${totalMeetings}`);
    
    if (totalMeetings === 0) {
      console.log("No meetings found in database");
      return;
    }
    
    // Get all unique employee IDs
    const uniqueEmployeeIds = await MeetingHistory.distinct('employeeId');
    console.log(`Unique employee IDs: ${uniqueEmployeeIds.length}`);
    console.log("Employee IDs:", uniqueEmployeeIds);
    
    // Get all unique lead IDs
    const uniqueLeadIds = await MeetingHistory.distinct('leadId');
    console.log(`Unique lead IDs: ${uniqueLeadIds.length}`);
    console.log("Lead IDs:", uniqueLeadIds.filter(id => id)); // Filter out null/undefined
    
    // Get sample meetings
    const sampleMeetings = await MeetingHistory.find().limit(5).lean();
    console.log("\n=== SAMPLE MEETINGS ===");
    sampleMeetings.forEach((meeting, index) => {
      console.log(`Meeting ${index + 1}:`);
      console.log(`  Employee ID: ${meeting.employeeId}`);
      console.log(`  Lead ID: ${meeting.leadId || 'N/A'}`);
      console.log(`  Customer: ${meeting.meetingDetails?.customerName || meeting.meetingDetails?.customers?.[0]?.customerName || 'N/A'}`);
      console.log(`  Timestamp: ${meeting.timestamp}`);
      console.log(`  Discussion: ${meeting.meetingDetails?.discussion?.substring(0, 50)}...`);
      console.log("---");
    });
    
    // Check for specific lead IDs mentioned by user
    const specificLeads = await MeetingHistory.find({
      leadId: { $in: ['JBDSL-0044', 'JBDSL-0001'] }
    }).lean();
    
    console.log(`\n=== MEETINGS WITH SPECIFIC LEAD IDs ===`);
    console.log(`Found ${specificLeads.length} meetings with lead IDs JBDSL-0044 or JBDSL-0001`);
    specificLeads.forEach((meeting) => {
      console.log(`Lead ID: ${meeting.leadId}, Employee ID: ${meeting.employeeId}, Customer: ${meeting.meetingDetails?.customerName || meeting.meetingDetails?.customers?.[0]?.customerName || 'N/A'}`);
    });
    
  } catch (error) {
    console.error("Error debugging meetings:", error);
  } finally {
    mongoose.connection.close();
  }
};

debugMeetings();
