// Test script to verify meeting time fix
const axios = require('axios');

async function testMeetingTimes() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('🧪 Testing meeting time preservation...');
  
  try {
    // Test data
    const testEmployeeId = '67daa55d9c4abb36045d5bfe';
    const startTime = new Date('2025-12-23T16:31:00.000Z').toISOString(); // 4:31 PM
    const endTime = new Date('2025-12-23T16:41:00.000Z').toISOString();   // 4:41 PM
    
    console.log('📅 Test times:');
    console.log('  Start time:', startTime);
    console.log('  End time:  ', endTime);
    
    // 1. Create a test meeting
    console.log('\n1️⃣ Creating test meeting...');
    const createResponse = await axios.post(`${baseUrl}/meetings`, {
      employeeId: testEmployeeId,
      location: {
        lat: 28.4595,
        lng: 77.0266,
        address: 'Test Location, Gurugram, Haryana, India'
      },
      clientName: 'Test Company',
      notes: 'Test meeting for time validation',
      startTime: startTime // Provide explicit start time
    });
    
    if (createResponse.status !== 201) {
      throw new Error(`Failed to create meeting: ${createResponse.status}`);
    }
    
    const meeting = createResponse.data;
    console.log('✅ Meeting created:', meeting.id);
    console.log('   Start time:', meeting.startTime);
    
    // 2. Update meeting to completed with explicit end time
    console.log('\n2️⃣ Ending meeting with explicit end time...');
    const updateResponse = await axios.put(`${baseUrl}/meetings/${meeting.id}`, {
      status: 'completed',
      endTime: endTime, // Provide explicit end time
      meetingDetails: {
        discussion: 'Test discussion',
        customers: [{
          customerEmployeeName: 'Test Customer',
          customerEmployeeDesignation: 'Manager'
        }]
      },
      endLocation: {
        lat: 28.4595,
        lng: 77.0266,
        address: 'Test End Location, Gurugram, Haryana, India',
        timestamp: endTime
      }
    });
    
    if (updateResponse.status !== 200) {
      throw new Error(`Failed to update meeting: ${updateResponse.status}`);
    }
    
    const updatedMeeting = updateResponse.data;
    console.log('✅ Meeting updated:', updatedMeeting.id);
    console.log('   Start time:', updatedMeeting.startTime);
    console.log('   End time:  ', updatedMeeting.endTime);
    
    // 3. Verify times are different
    const actualStartTime = new Date(updatedMeeting.startTime);
    const actualEndTime = new Date(updatedMeeting.endTime);
    const timeDifference = actualEndTime.getTime() - actualStartTime.getTime();
    const minutesDifference = Math.round(timeDifference / (1000 * 60));
    
    console.log('\n📊 Time Analysis:');
    console.log('   Time difference:', timeDifference, 'ms');
    console.log('   Minutes difference:', minutesDifference, 'minutes');
    
    if (timeDifference > 0 && minutesDifference === 10) {
      console.log('✅ SUCCESS: Times are correctly preserved!');
      console.log('   Start time was NOT overwritten');
      console.log('   End time was set correctly');
    } else {
      console.log('❌ FAILURE: Time issue detected!');
      console.log('   Expected 10 minutes difference, got:', minutesDifference);
    }
    
    // 4. Test analytics API to see formatted times
    console.log('\n3️⃣ Testing analytics API formatting...');
    const analyticsResponse = await axios.get(`${baseUrl}/analytics/employee-details/${testEmployeeId}?dateRange=today`);
    
    if (analyticsResponse.status === 200) {
      const analyticsData = analyticsResponse.data;
      const todaysMeeting = analyticsData.meetingRecords?.find(m => m.meetingId === meeting.id);
      
      if (todaysMeeting) {
        console.log('✅ Analytics data found:');
        console.log('   Meeting In Time: ', todaysMeeting.meetingInTime);
        console.log('   Meeting Out Time:', todaysMeeting.meetingOutTime);
        
        if (todaysMeeting.meetingInTime !== todaysMeeting.meetingOutTime) {
          console.log('✅ SUCCESS: Analytics shows different times!');
        } else {
          console.log('❌ FAILURE: Analytics still shows same times!');
        }
      } else {
        console.log('⚠️ Meeting not found in analytics data');
      }
    }
    
    // 5. Clean up - delete test meeting
    console.log('\n4️⃣ Cleaning up test meeting...');
    await axios.delete(`${baseUrl}/meetings/${meeting.id}`);
    console.log('✅ Test meeting deleted');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testMeetingTimes();