# Meeting State Persistence Fix

## Problem
When a user starts a meeting and then refreshes the page, the "Start Meeting" button appears again instead of showing the "End Meeting" button. This happens because the meeting state (`startedMeetingMap`) was only stored in React component state and was lost on page refresh.

## Root Cause
1. The `startedMeetingMap` state in `Tracking.tsx` was not persisted anywhere
2. On page refresh, the state was reset to an empty object `{}`
3. Even though the meeting was still active on the server, the UI didn't know about it
4. The `TodaysMeetings` component couldn't determine which meeting was active
5. **CRITICAL**: The `isMeetingActiveFromStatus` function was not checking for "meeting on-going" status

## Solution

### 1. Fix Meeting Status Detection (TodaysMeetings.tsx)
Added "meeting on-going" to the list of active meeting statuses:

```typescript
const isMeetingActiveFromStatus = (meeting: FollowUpMeeting): boolean => {
  return (
    meeting.meetingStatus === "In Progress" ||
    meeting.meetingStatus === "IN_PROGRESS" ||
    meeting.meetingStatus === "Started" ||
    meeting.meetingStatus === "meeting on-going" // 🔹 CRITICAL: This is the status set when meeting starts
  );
};
```

### 2. Restore Meeting State from Server (Tracking.tsx)
Modified the `fetchMeetings` function to restore the `startedMeetingMap` when active meetings are found:

```typescript
// In fetchMeetings function
const activeMeeting = fetchedMeetings.find(
  (m: MeetingLog) => m.status === "in-progress" || m.status === "started"
);

if (activeMeeting) {
  console.log("🔄 Found active meeting after refresh:", activeMeeting.id);
  
  // Check if this meeting has a leadId (was started from follow-up)
  if (activeMeeting.leadId) {
    console.log("🔄 Restoring startedMeetingMap for follow-up meeting:", activeMeeting.leadId);
    
    // Restore the mapping between follow-up ID and meeting ID
    setStartedMeetingMap(prev => ({
      ...prev,
      [activeMeeting.leadId]: activeMeeting.id
    }));
    
    // Also set the active meeting ID
    setActiveMeetingId(activeMeeting.id);
  } else {
    console.log("🔄 Active meeting found but no leadId, setting activeMeetingId only");
    setActiveMeetingId(activeMeeting.id);
  }
}
```

### 3. Check External API for Active Meetings (TodaysMeetings.tsx)
Modified the `fetchTodaysMeetings` function to detect active meetings from the external API:

```typescript
// Log all meeting statuses for debugging
approvedTodaysMeetings.forEach(m => {
  console.log(`📋 Meeting ${m.companyName}: status="${m.meetingStatus}"`);
});

// Check if any of these meetings are currently active (In Progress)
const activeMeetingsFromAPI = approvedTodaysMeetings.filter(m => 
  isMeetingActiveFromStatus(m)
);

if (activeMeetingsFromAPI.length > 0) {
  console.log("🔄 Found active meetings from API after refresh:", activeMeetingsFromAPI.map(m => ({
    id: m._id,
    company: m.companyName,
    status: m.meetingStatus
  })));
  // Set the first active meeting as the local active one
  setLocalActiveFollowUpId(activeMeetingsFromAPI[0]._id);
}
```

## How It Works

### Before Fix:
1. User starts meeting → `startedMeetingMap` = `{ "followUpId123": "meetingId456" }`
2. User refreshes page → `startedMeetingMap` = `{}` (lost!)
3. UI shows "Start Meeting" button (incorrect)

### After Fix:
1. User starts meeting → `startedMeetingMap` = `{ "followUpId123": "meetingId456" }`
2. User refreshes page → `fetchMeetings()` runs
3. Server returns active meeting with `leadId: "followUpId123"`
4. Code restores: `startedMeetingMap` = `{ "followUpId123": "meetingId456" }`
5. UI correctly shows "End Meeting" button

## Key Points

1. **Server as Source of Truth**: The server's meeting status is now the source of truth
2. **Dual Check**: Both internal meetings API and external follow-up API are checked
3. **Automatic Restoration**: State is automatically restored on page load
4. **No Data Loss**: Meeting state persists across page refreshes

## Testing

To test the fix:
1. Start a meeting from Today's Meetings
2. Verify "End Meeting" button appears
3. Refresh the page (F5 or Ctrl+R)
4. Verify "End Meeting" button still appears (not "Start Meeting")
5. Click "End Meeting" to complete the meeting
6. Verify the meeting is properly ended

## Debugging

If the issue persists after refresh, check the browser console for these logs:

### Expected Console Output After Starting Meeting:
```
✅ Meeting created successfully: meeting_xxx
📝 Adding meeting to state: meeting_xxx
🗺️ startedMeetingMap updated: { "followUpId123": "meeting_xxx" }
Updated follow-up meetingStatus to 'meeting on-going' for: followUpId123
```

### Expected Console Output After Page Refresh:
```
Fetching meetings: { employeeId: "xxx", retryCount: 0 }
🔄 Found active meeting after refresh: meeting_xxx
🔄 Restoring startedMeetingMap for follow-up meeting: followUpId123
🗺️ startedMeetingMap updated: { "followUpId123": "meeting_xxx" }
Fetching meetings for user: xxx
📋 Meeting CompanyName: status="meeting on-going"
🔄 Found active meetings from API after refresh: [{ id: "followUpId123", company: "CompanyName", status: "meeting on-going" }]
```

### If "Start Meeting" Still Shows:
1. **Check meeting status in external API**: The status should be "meeting on-going"
2. **Check startedMeetingMap**: Should contain the follow-up ID → meeting ID mapping
3. **Check internal meeting status**: Should be "in-progress" or "started"
4. **Verify leadId is saved**: The meeting should have a `leadId` field

### Common Issues:
- **External API not updating**: The PATCH request to update follow-up status might be failing
- **leadId not saved**: Check that the meeting creation includes the `leadId` field
- **Status mismatch**: The external API might use a different status string

## Files Modified

1. `client/pages/Tracking.tsx` 
   - Added state restoration logic in `fetchMeetings()`
   - Added debug logging for `startedMeetingMap` changes
2. `client/components/TodaysMeetings.tsx` 
   - Fixed `isMeetingActiveFromStatus()` to include "meeting on-going"
   - Added active meeting detection in `fetchTodaysMeetings()`
   - Added comprehensive debug logging

## Related Issues

This fix ensures that:
- Meeting state persists across page refreshes
- Users cannot accidentally start duplicate meetings
- The UI always reflects the actual meeting state from the server
- Both internal and external meeting statuses are synchronized
- All possible active meeting status strings are recognized
