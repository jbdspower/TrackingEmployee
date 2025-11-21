# Analytics Location Display Fix

## Problem
The analytics API was showing incorrect location data:

1. **Meeting Out Location** was displayed even when the meeting was still **in-progress**
2. **Meeting Out Location** was showing the **start location** instead of the actual end location
3. **Day Out Location** was showing the start location of the last meeting instead of the end location

## Example of the Bug
```json
{
  "meetingRecords": [{
    "meetingStatus": "in-progress",  // ❌ Meeting not ended yet
    "meetingInLocation": "Muzaffarnagar, Uttar Pradesh, India",
    "meetingOutLocation": "Muzaffarnagar, Uttar Pradesh, India"  // ❌ Should be empty!
  }]
}
```

## Root Cause
In `server/routes/analytics.ts`:

1. **Line 521**: Used `meeting.location?.address` for `outLocationAddress` (wrong field - this is start location)
2. **Line 542**: Used `meeting.location?.address` for `meetingOutLocation` (wrong field - this is start location)
3. No check if meeting has actually ended before showing end location

## Solution

### Fixed Code

#### Day Records (Line 515-527)
```typescript
const lastMeeting = meetings[meetings.length - 1];

return {
  date,
  totalMeetings,
  startLocationTime: meetings[0]?.startTime || "",
  startLocationAddress: meetings[0]?.location?.address || "",
  outLocationTime: lastMeeting?.endTime || "",
  // ✅ Only show end location if meeting has ended
  outLocationAddress: lastMeeting?.endTime && lastMeeting?.location?.endLocation?.address 
    ? lastMeeting.location.endLocation.address 
    : "",
  totalDutyHours: 8,
  meetingTime: totalMeetingHours,
  travelAndLunchTime: Math.max(0, 8 - totalMeetingHours),
};
```

#### Meeting Records (Line 534-556)
```typescript
const meetingRecords = employeeMeetings.map((meeting) => ({
  employeeName: "",
  companyName: meeting.clientName || "Unknown Company",
  date: format(new Date(meeting.startTime), "yyyy-MM-dd"),
  leadId: meeting.leadId || "",
  meetingInTime: format(new Date(meeting.startTime), "HH:mm"),
  meetingInLocation: meeting.location?.address || "",
  meetingOutTime: meeting.endTime
    ? format(new Date(meeting.endTime), "HH:mm")
    : "",
  // ✅ Only show end location if meeting has ended, use endLocation field
  meetingOutLocation: meeting.endTime && meeting.location?.endLocation?.address
    ? meeting.location.endLocation.address
    : "",
  totalStayTime: calculateMeetingDuration(meeting.startTime, meeting.endTime),
  discussion: meeting.meetingDetails?.discussion || meeting.notes || "",
  meetingPerson: meeting.meetingDetails?.customers?.length > 0
    ? meeting.meetingDetails.customers.map((c) => c.customerEmployeeName).join(", ")
    : meeting.meetingDetails?.customerEmployeeName || "Unknown",
  meetingStatus: meeting.status || "completed",
  incomplete: meeting.meetingDetails?.incomplete || false,
  incompleteReason: meeting.meetingDetails?.incompleteReason || "",
}));
```

## Key Changes

1. **Conditional Display**: End location only shows if `meeting.endTime` exists
2. **Correct Field**: Uses `meeting.location.endLocation.address` instead of `meeting.location.address`
3. **Empty String**: Returns empty string for in-progress meetings

## Expected Behavior After Fix

### In-Progress Meeting
```json
{
  "meetingRecords": [{
    "meetingStatus": "in-progress",
    "meetingInLocation": "Muzaffarnagar, Uttar Pradesh, India",
    "meetingOutTime": "",
    "meetingOutLocation": ""  // ✅ Empty until meeting ends
  }]
}
```

### Completed Meeting (Different Locations)
```json
{
  "meetingRecords": [{
    "meetingStatus": "completed",
    "meetingInLocation": "Muzaffarnagar, Uttar Pradesh, India",
    "meetingOutTime": "10:30",
    "meetingOutLocation": "Gurgaon, Haryana, India"  // ✅ Shows actual end location
  }]
}
```

### Day Records
```json
{
  "dayRecords": [{
    "date": "2025-11-21",
    "startLocationAddress": "Muzaffarnagar, Uttar Pradesh, India",
    "outLocationTime": "",
    "outLocationAddress": ""  // ✅ Empty until day ends (last meeting completes)
  }]
}
```

## Testing

1. **Start a meeting** from Location A (e.g., Muzaffarnagar)
   - Check API: `meetingOutLocation` should be **empty**
   - Check API: `outLocationAddress` should be **empty**

2. **End the meeting** from Location B (e.g., Gurgaon)
   - Check API: `meetingOutLocation` should show **"Gurgaon, Haryana, India"**
   - Check API: `outLocationAddress` should show **"Gurgaon, Haryana, India"**

3. **Multiple meetings in a day**
   - Day's `outLocationAddress` should show the end location of the **last completed meeting**

## Files Modified
- `server/routes/analytics.ts` - Fixed location display logic

## Related Fixes
- See `LOCATION_TRACKING_FIX.md` for the location capture improvements
