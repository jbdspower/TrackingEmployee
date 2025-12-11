# Testing Guide: Meeting-Based Location Tracking

## Quick Test (5 minutes)

### Prerequisites
- Server running on `http://localhost:5000`
- Employee account with valid credentials
- Browser with location permissions enabled

### Test Steps

#### 1. Start First Meeting (Sets Start Location Time)

1. **Login as Employee**
   - Navigate to tracking page
   - Click "LogIn" button (starts tracking session)

2. **Start Meeting**
   - Click "Start Meeting" button
   - Allow location access when prompted
   - Fill in meeting details:
     - Client Name: "Test Client A"
     - Notes: "First meeting of the day"
   - Click "Start Meeting"
   
3. **Verify**
   - ✅ Meeting should show as "In Progress"
   - ✅ Location should be captured
   - ✅ Current time should be recorded

#### 2. End First Meeting

1. **End Meeting**
   - Click "End Meeting" button
   - Fill in meeting details:
     - Discussion: "Test discussion"
     - Customer Name: "John Doe"
     - Designation: "Manager"
   - Click "Complete Meeting"

2. **Verify**
   - ✅ Meeting should show as "Completed"
   - ✅ End location should be captured
   - ✅ End time should be recorded

#### 3. Start Second Meeting (Optional)

1. **Start Another Meeting**
   - Click "Start Meeting" button again
   - Fill in details for second meeting
   - Complete the meeting

2. **Purpose**
   - Tests that system uses FIRST meeting for start time
   - Tests that system uses LAST meeting for end time

#### 4. Check Dashboard

1. **Navigate to Dashboard**
   - Go to Analytics Dashboard
   - Find your employee in the list
   - Click "View Details"

2. **Verify Daily Summary Table**
   - ✅ **Start Location Time**: Should match FIRST meeting start time
   - ✅ **Start Location Address**: Should show FIRST meeting location
   - ✅ **Out Location Time**: Should match LAST meeting end time
   - ✅ **Out Location Address**: Should show LAST meeting end location

3. **Expected Result**
   ```
   Date: 12/11/2024
   Total Meetings: 2
   Start Location Time: 09:30  ← From first meeting
   Start Location Address: Test Client A, New Delhi
   Out Location Time: 14:00  ← From last meeting
   Out Location Address: Test Client B, Mumbai
   ```

## Automated Test Script

### Using PowerShell

```powershell
# Run the test script
.\test-meeting-based-tracking.ps1
```

**Note**: Update the `$employeeId` variable in the script with your actual employee ID.

### Expected Output

```
🧪 Testing Meeting-Based Location Tracking
==========================================

Step 1: Creating test meeting...
✅ Meeting created: meeting_123
   Start Time: 2024-12-11T09:30:00.000Z
   Location: Test Location, New Delhi

⏳ Waiting 2 seconds...

Step 2: Ending meeting...
✅ Meeting ended successfully
   End Time: 2024-12-11T11:00:00.000Z

Step 3: Fetching employee details...
✅ Employee details fetched

📊 Today's Record:
   Date: 2024-12-11
   Total Meetings: 1

   ✅ Start Location Time: 2024-12-11T09:30:00.000Z
      (Should match first meeting start time)
   📍 Start Location: Test Location, New Delhi

   ✅ Out Location Time: 2024-12-11T11:00:00.000Z
      (Should match last meeting end time)
   📍 Out Location: Test End Location, New Delhi

✅ SUCCESS: Times match meeting start/end times!

🎉 Test completed!
```

## Manual Verification Checklist

### ✅ Basic Functionality
- [ ] Can start a meeting
- [ ] Location is captured when meeting starts
- [ ] Can end a meeting
- [ ] End location is captured when meeting ends
- [ ] Dashboard displays start location time
- [ ] Dashboard displays out location time
- [ ] Addresses are human-readable (not just coordinates)

### ✅ Multiple Meetings
- [ ] Start location time uses FIRST meeting
- [ ] Out location time uses LAST meeting
- [ ] Middle meetings don't affect start/out times
- [ ] All meetings are counted in "Total Meetings"

### ✅ Edge Cases
- [ ] No meetings today shows "-" for times
- [ ] Incomplete meeting (not ended) shows "-" for out time
- [ ] Location permission denied shows coordinates instead of address
- [ ] GPS unavailable shows appropriate error

### ✅ Data Accuracy
- [ ] Times are in correct timezone
- [ ] Addresses match actual GPS locations
- [ ] Meeting count is accurate
- [ ] Duty hours calculation is correct

## Common Issues & Solutions

### Issue 1: Location Not Captured
**Symptom**: Start/Out location shows "-" even after meetings

**Solution**:
1. Check browser location permissions
2. Ensure GPS is enabled on device
3. Check browser console for errors
4. Verify network connectivity

### Issue 2: Wrong Times Displayed
**Symptom**: Start/Out times don't match meeting times

**Solution**:
1. Clear browser cache
2. Restart server
3. Check server logs for errors
4. Verify database has correct data

### Issue 3: Address Shows Coordinates
**Symptom**: Address shows "28.6139, 77.209" instead of readable address

**Solution**:
1. Check internet connectivity (needed for geocoding)
2. Verify Nominatim API is accessible
3. Check rate limiting (max 1 request/second)
4. Wait a few seconds and refresh

### Issue 4: Dashboard Not Updating
**Symptom**: Dashboard doesn't show new meeting data

**Solution**:
1. Refresh the page
2. Check date filter (ensure "Today" is selected)
3. Verify employee filter is correct
4. Check browser console for API errors

## API Testing (Advanced)

### Test Endpoints Directly

#### 1. Create Meeting
```bash
curl -X POST http://localhost:5000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "YOUR_EMPLOYEE_ID",
    "location": {
      "lat": 28.6139,
      "lng": 77.209,
      "address": "Test Location"
    },
    "clientName": "Test Client",
    "notes": "Test meeting"
  }'
```

#### 2. End Meeting
```bash
curl -X PUT http://localhost:5000/api/meetings/MEETING_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "endLocation": {
      "lat": 28.6150,
      "lng": 77.210,
      "address": "Test End Location"
    },
    "meetingDetails": {
      "discussion": "Test discussion",
      "customers": [{
        "customerEmployeeName": "Test Customer",
        "customerEmployeeDesignation": "Manager"
      }]
    }
  }'
```

#### 3. Get Employee Details
```bash
curl http://localhost:5000/api/analytics/employee-details/YOUR_EMPLOYEE_ID?dateRange=today
```

### Expected Response
```json
{
  "dayRecords": [{
    "date": "2024-12-11",
    "totalMeetings": 1,
    "startLocationTime": "2024-12-11T09:30:00.000Z",
    "startLocationAddress": "Test Location, New Delhi",
    "outLocationTime": "2024-12-11T11:00:00.000Z",
    "outLocationAddress": "Test End Location, New Delhi",
    "totalDutyHours": 8,
    "meetingTime": 1.5,
    "travelAndLunchTime": 6.5
  }],
  "meetingRecords": [...]
}
```

## Performance Testing

### Load Test
1. Create 10 meetings for same employee
2. Verify dashboard loads within 2 seconds
3. Check all meetings are displayed correctly
4. Verify start/out times are from first/last meetings

### Stress Test
1. Create meetings for 50 employees
2. Load dashboard with "All Employees" filter
3. Verify page loads within 5 seconds
4. Check all data is accurate

## Regression Testing

### Ensure Existing Features Still Work
- [ ] Login/Logout tracking sessions
- [ ] Meeting history
- [ ] Route tracking
- [ ] Attendance management
- [ ] Analytics reports
- [ ] Export functionality

## Sign-Off Checklist

Before deploying to production:

- [ ] All basic functionality tests pass
- [ ] Multiple meetings scenario works correctly
- [ ] Edge cases handled properly
- [ ] Data accuracy verified
- [ ] Performance is acceptable
- [ ] No regressions in existing features
- [ ] Documentation is complete
- [ ] Test script runs successfully

## Support

If you encounter issues:

1. Check server logs: `npm run dev` output
2. Check browser console: F12 → Console tab
3. Check network requests: F12 → Network tab
4. Review documentation: `MEETING_BASED_LOCATION_TRACKING.md`
5. Check flow diagram: `MEETING_TRACKING_FLOW.md`

## Next Steps

After successful testing:

1. Deploy to staging environment
2. Run full test suite again
3. Get user acceptance testing (UAT)
4. Deploy to production
5. Monitor for issues
6. Collect user feedback
