#!/usr/bin/env node

/**
 * Debug script to identify the exact cause of the timing issue
 * where meeting in and out times show the same value
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function debugTimingIssue() {
    console.log('🔍 Debugging Meeting Timing Issue');
    console.log('==================================');

    try {
        // Step 1: Get all meetings from the database
        console.log('\n1. Fetching all meetings from database...');
        const meetingsResponse = await axios.get(`${BASE_URL}/api/meetings?limit=20`);
        const meetings = meetingsResponse.data.meetings || [];
        
        console.log(`Found ${meetings.length} meetings`);
        
        // Step 2: Analyze each meeting for timing issues
        console.log('\n2. Analyzing meeting times...');
        let issueCount = 0;
        
        for (const meeting of meetings) {
            const startTime = new Date(meeting.startTime);
            const endTime = meeting.endTime ? new Date(meeting.endTime) : null;
            
            console.log(`\n📋 Meeting: ${meeting.clientName || 'Unknown'}`);
            console.log(`   ID: ${meeting.id}`);
            console.log(`   Status: ${meeting.status}`);
            console.log(`   Start Time (raw): ${meeting.startTime}`);
            console.log(`   End Time (raw): ${meeting.endTime || 'N/A'}`);
            
            if (endTime) {
                const duration = endTime.getTime() - startTime.getTime();
                const durationMinutes = Math.round(duration / (1000 * 60));
                
                console.log(`   Duration: ${durationMinutes} minutes`);
                
                // Check for timing issues
                if (duration < 60000) { // Less than 1 minute
                    console.log(`   ❌ ISSUE: Duration is ${duration}ms (less than 1 minute)`);
                    issueCount++;
                    
                    // Check if times are exactly the same
                    if (meeting.startTime === meeting.endTime) {
                        console.log(`   ❌ CRITICAL: Start and end times are IDENTICAL!`);
                        console.log(`   Raw values: "${meeting.startTime}" === "${meeting.endTime}"`);
                    }
                } else {
                    console.log(`   ✅ Duration looks normal`);
                }
            } else {
                console.log(`   ⏳ Meeting is still active`);
            }
        }
        
        console.log(`\n📊 Summary: Found ${issueCount} meetings with timing issues out of ${meetings.length} total`);
        
        // Step 3: Test the analytics API
        console.log('\n3. Testing analytics API...');
        
        try {
            const analyticsResponse = await axios.get(`${BASE_URL}/api/analytics/employees?dateRange=today`);
            const analytics = analyticsResponse.data.analytics || [];
            
            if (analytics.length > 0) {
                const employeeWithMeetings = analytics.find(emp => emp.totalMeetings > 0);
                
                if (employeeWithMeetings) {
                    console.log(`\n📊 Testing employee details: ${employeeWithMeetings.employeeName}`);
                    
                    const detailsResponse = await axios.get(
                        `${BASE_URL}/api/analytics/employee-details/${employeeWithMeetings.employeeId}?dateRange=today`
                    );
                    
                    const meetingRecords = detailsResponse.data.meetingRecords || [];
                    
                    console.log(`Found ${meetingRecords.length} meeting records in analytics`);
                    
                    for (const record of meetingRecords) {
                        console.log(`\n📋 Analytics Record: ${record.companyName}`);
                        console.log(`   Meeting In Time: ${record.meetingInTime}`);
                        console.log(`   Meeting Out Time: ${record.meetingOutTime}`);
                        
                        if (record.meetingInTime === record.meetingOutTime && record.meetingOutTime !== 'In Progress') {
                            console.log(`   ❌ ANALYTICS ISSUE: In and out times are the same!`);
                            
                            // Find the corresponding raw meeting
                            const rawMeeting = meetings.find(m => m.clientName === record.companyName);
                            if (rawMeeting) {
                                console.log(`   🔍 Raw meeting data:`);
                                console.log(`      Start: ${rawMeeting.startTime}`);
                                console.log(`      End: ${rawMeeting.endTime}`);
                                console.log(`      Same raw times? ${rawMeeting.startTime === rawMeeting.endTime}`);
                            }
                        } else {
                            console.log(`   ✅ Analytics times look different`);
                        }
                    }
                }
            }
        } catch (analyticsError) {
            console.error('❌ Analytics API error:', analyticsError.message);
        }
        
        // Step 4: Recommendations
        console.log('\n4. Recommendations:');
        
        if (issueCount > 0) {
            console.log('❌ TIMING ISSUES DETECTED:');
            console.log('   - Check if meetings are being ended immediately after starting');
            console.log('   - Verify that exactEndTime is being captured correctly');
            console.log('   - Check for race conditions in the update process');
            console.log('   - Look for any code that might be overwriting endTime with startTime');
        } else {
            console.log('✅ No obvious timing issues found in the database');
            console.log('   - The issue might be in the analytics formatting');
            console.log('   - Or it might be a specific scenario not covered by current data');
        }
        
    } catch (error) {
        console.error('❌ Debug script error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the server is running on http://localhost:3000');
        }
    }
}

// Run the debug script
debugTimingIssue().then(() => {
    console.log('\n✅ Debug complete');
}).catch(error => {
    console.error('❌ Debug failed:', error.message);
});