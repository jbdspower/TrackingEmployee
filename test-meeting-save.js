/**
 * Test Script: Verify Meeting Save Functionality
 * 
 * Run this script to test if meetings can be saved to MongoDB
 * 
 * Usage: node test-meeting-save.js
 */

const mongoose = require('mongoose');

// Update this with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracking';

// Meeting Schema (simplified)
const meetingSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    timestamp: String
  },
  startTime: { type: String, required: true },
  endTime: String,
  clientName: String,
  notes: String,
  status: { type: String, enum: ['started', 'in-progress', 'completed'], default: 'in-progress' },
  followUpId: { type: String, index: true },
  externalMeetingStatus: String
}, { timestamps: true });

const Meeting = mongoose.model('Meeting', meetingSchema);

async function testMeetingSave() {
  console.log('🔍 Testing Meeting Save Functionality\n');
  
  try {
    // Step 1: Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log('   Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 2: Check existing meetings
    console.log('📊 Checking existing meetings...');
    const employeeId = '690af5906c1df351e8225512';
    const existingCount = await Meeting.countDocuments({ employeeId });
    console.log(`   Found ${existingCount} existing meetings for employee ${employeeId}\n`);
    
    // Step 3: Create test meeting
    console.log('💾 Creating test meeting...');
    const testMeeting = new Meeting({
      employeeId: employeeId,
      location: {
        lat: 28.6139,
        lng: 77.2090,
        address: 'Test Location - New Delhi',
        timestamp: new Date().toISOString()
      },
      startTime: new Date().toISOString(),
      clientName: 'Test Client',
      notes: 'Test meeting created by diagnostic script',
      status: 'in-progress',
      followUpId: 'test_' + Date.now(),
      externalMeetingStatus: 'meeting on-going'
    });
    
    const savedMeeting = await testMeeting.save();
    console.log('✅ Meeting saved successfully!');
    console.log('   Meeting ID:', savedMeeting._id);
    console.log('   Employee ID:', savedMeeting.employeeId);
    console.log('   Follow-up ID:', savedMeeting.followUpId);
    console.log('   Status:', savedMeeting.status);
    console.log('   Client:', savedMeeting.clientName, '\n');
    
    // Step 4: Verify it was saved
    console.log('🔍 Verifying meeting was saved...');
    const verification = await Meeting.findById(savedMeeting._id);
    if (verification) {
      console.log('✅ VERIFIED: Meeting exists in database\n');
    } else {
      console.error('❌ VERIFICATION FAILED: Meeting not found!\n');
      process.exit(1);
    }
    
    // Step 5: Query by employeeId
    console.log('🔍 Querying meetings by employeeId...');
    const meetings = await Meeting.find({ employeeId });
    console.log(`✅ Found ${meetings.length} meetings for employee ${employeeId}`);
    meetings.forEach((m, i) => {
      console.log(`   ${i + 1}. ID: ${m._id}, Status: ${m.status}, Client: ${m.clientName}`);
    });
    console.log('');
    
    // Step 6: Query by status
    console.log('🔍 Querying meetings by status=in-progress...');
    const activeMeetings = await Meeting.find({ 
      employeeId, 
      status: 'in-progress' 
    });
    console.log(`✅ Found ${activeMeetings.length} active meetings`);
    activeMeetings.forEach((m, i) => {
      console.log(`   ${i + 1}. ID: ${m._id}, Follow-up: ${m.followUpId}, Client: ${m.clientName}`);
    });
    console.log('');
    
    // Step 7: Clean up test meeting
    console.log('🧹 Cleaning up test meeting...');
    await Meeting.findByIdAndDelete(savedMeeting._id);
    console.log('✅ Test meeting deleted\n');
    
    // Step 8: Final summary
    console.log('═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('Your MongoDB connection is working correctly.');
    console.log('Meetings can be saved and queried successfully.');
    console.log('');
    console.log('If you\'re still having issues:');
    console.log('1. Check that the employeeId matches exactly');
    console.log('2. Check server logs when creating meetings');
    console.log('3. Verify the meeting status is "in-progress"');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 MongoDB is not running or not accessible');
      console.error('   - Check if MongoDB is started');
      console.error('   - Verify connection string');
      console.error('   - Check network/firewall settings');
    } else if (error.message.includes('authentication')) {
      console.error('💡 Authentication failed');
      console.error('   - Check username and password');
      console.error('   - Verify user has correct permissions');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Connection timeout');
      console.error('   - Check network connectivity');
      console.error('   - Verify MongoDB server is accessible');
    }
    
    console.error('═══════════════════════════════════════\n');
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the test
testMeetingSave();
