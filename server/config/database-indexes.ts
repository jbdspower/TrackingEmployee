// config/database-indexes.ts
import mongoose from 'mongoose';

async function createIndexes() {
  try {
    console.log('🔄 Creating database indexes...');
    
    // Get all collections
    const db = mongoose.connection.db;
    if (!db) {
      console.log('❌ No database connection available');
      return;
    }

    // Create indexes for meetings collection
    await db.collection('meetings').createIndex({ employeeId: 1 });
    await db.collection('meetings').createIndex({ startTime: -1 });
    await db.collection('meetings').createIndex({ employeeId: 1, startTime: -1 });
    await db.collection('meetings').createIndex({ startTime: -1, employeeId: 1 });
    await db.collection('meetings').createIndex({ leadId: 1 });
    await db.collection('meetings').createIndex({ status: 1 });
    await db.collection('meetings').createIndex({ employeeId: 1, status: 1, startTime: -1 });
    await db.collection('meetings').createIndex({ followUpId: 1, status: 1, startTime: -1 });
    await db.collection('meetings').createIndex({ employeeId: 1, clientName: 1, startTime: -1 });
    await db.collection('meetings').createIndex({ employeeId: 1, meetingStatus: 1, startTime: -1 });
    console.log('✅ Meeting indexes created');
    
    // Create indexes for attendance collection (actual collection: "attendance")
    await db.collection('attendance').createIndex({ employeeId: 1, date: 1 }, { unique: true });
    await db.collection('attendance').createIndex({ date: 1 });
    await db.collection('attendance').createIndex({ employeeId: 1 });
    await db.collection('attendance').createIndex({ employeeId: 1, date: -1 });
    await db.collection('attendance').createIndex({ date: -1, employeeId: 1 });
    console.log('✅ Attendance indexes created');
    
    // Create indexes for tracking sessions collection (actual collection: "tracking_sessions")
    await db.collection('tracking_sessions').createIndex({ employeeId: 1, startTime: -1 });
    await db.collection('tracking_sessions').createIndex({ startTime: -1 });
    await db.collection('tracking_sessions').createIndex({ startTime: -1, employeeId: 1 });
    await db.collection('tracking_sessions').createIndex({ status: 1 });
    await db.collection('tracking_sessions').createIndex({ employeeId: 1, status: 1, startTime: -1 });
    console.log('✅ TrackingSession indexes created');

    // Create indexes for meeting history collection (actual collection: "meeting_history")
    await db.collection('meeting_history').createIndex({ employeeId: 1, timestamp: -1 });
    await db.collection('meeting_history').createIndex({ leadId: 1, timestamp: -1 });
    await db.collection('meeting_history').createIndex({ sessionId: 1, timestamp: -1 });
    console.log('✅ MeetingHistory indexes created');

    console.log('🎉 All database indexes created successfully');
  } catch (error: any) {
    console.error('❌ Error creating indexes:', error.message);
    // Don't throw error - continue without indexes if they already exist
  }
}

export { createIndexes };