// Migration script to add meetingStatus field to existing meetings
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-tracking';

async function migrateMeetingStatus() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`📍 URI: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const meetingsCollection = db.collection('meetings');

    // Check current state
    const totalMeetings = await meetingsCollection.countDocuments({});
    const meetingsWithoutStatus = await meetingsCollection.countDocuments({ meetingStatus: { $exists: false } });
    
    console.log(`📊 Total meetings in database: ${totalMeetings}`);
    console.log(`📊 Meetings without meetingStatus: ${meetingsWithoutStatus}`);

    if (meetingsWithoutStatus === 0) {
      console.log('✅ All meetings already have meetingStatus field. No migration needed.');
      return;
    }

    console.log('🔄 Starting migration...');

    // Update all meetings that don't have meetingStatus field
    const result = await meetingsCollection.updateMany(
      { meetingStatus: { $exists: false } },
      [
        {
          $set: {
            meetingStatus: {
              $cond: {
                if: { $eq: ["$status", "completed"] },
                then: "complete",
                else: "in-progress"
              }
            }
          }
        }
      ]
    );

    console.log(`✅ Migration completed: ${result.modifiedCount} meetings updated`);

    // Verify the migration
    const meetingsWithStatusAfter = await meetingsCollection.countDocuments({ meetingStatus: { $exists: true } });
    
    console.log(`📊 Total meetings: ${totalMeetings}`);
    console.log(`📊 Meetings with meetingStatus after migration: ${meetingsWithStatusAfter}`);

    if (totalMeetings === meetingsWithStatusAfter) {
      console.log('✅ Migration successful! All meetings now have meetingStatus field');
    } else {
      console.log('⚠️ Some meetings still missing meetingStatus field');
    }

    // Show sample of migrated data
    const sampleMeetings = await meetingsCollection.find({}, { 
      projection: { _id: 1, status: 1, meetingStatus: 1, employeeId: 1, startTime: 1 } 
    }).limit(3).toArray();
    
    console.log('📋 Sample migrated meetings:');
    sampleMeetings.forEach((meeting, index) => {
      console.log(`  ${index + 1}. ID: ${meeting._id}, status: ${meeting.status}, meetingStatus: ${meeting.meetingStatus}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const scriptPath = resolve(process.argv[1]);
const currentPath = resolve(__filename);

const isMainModule = currentPath === scriptPath;
console.log('🔍 Script execution check:', { 
  isMainModule, 
  currentPath, 
  scriptPath 
});

if (isMainModule) {
  console.log('🚀 Executing migration as main module...');
  migrateMeetingStatus().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} else {
  console.log('📦 Migration script imported as module');
}

export { migrateMeetingStatus };