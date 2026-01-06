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
    await db.collection('meetings').createIndex({ leadId: 1 });
    await db.collection('meetings').createIndex({ status: 1 });
    console.log('✅ Meeting indexes created');
    
    // Create indexes for attendance collection
    await db.collection('attendances').createIndex({ employeeId: 1, date: 1 }, { unique: true });
    await db.collection('attendances').createIndex({ date: 1 });
    await db.collection('attendances').createIndex({ employeeId: 1 });
    console.log('✅ Attendance indexes created');
    
    // Create indexes for trackingsessions collection
    await db.collection('trackingsessions').createIndex({ employeeId: 1, startTime: -1 });
    await db.collection('trackingsessions').createIndex({ startTime: -1 });
    await db.collection('trackingsessions').createIndex({ status: 1 });
    console.log('✅ TrackingSession indexes created');

    // Create indexes for meetinghistory collection
    await db.collection('meetinghistories').createIndex({ employeeId: 1, meetingDate: -1 });
    await db.collection('meetinghistories').createIndex({ leadId: 1 });
    console.log('✅ MeetingHistory indexes created');

    console.log('🎉 All database indexes created successfully');
  } catch (error: any) {
    console.error('❌ Error creating indexes:', error.message);
    // Don't throw error - continue without indexes if they already exist
  }
}

export { createIndexes };