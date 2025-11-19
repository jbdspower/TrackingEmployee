# Today's Incomplete Meetings Feature

## Overview
When a user tries to logout and has **Today's meetings that are not completed**, they will be prompted to provide a **separate reason for each company/meeting**. These meetings will then be marked as "Incomplete" status in the system.

## Key Difference from Previous Implementation
- **Before**: Checked for "Pending" status meetings
- **Now**: Checks for Today's **Approved** meetings that are NOT completed (not started or in progress)

## How It Works

### 1. Logout Detection
When user clicks logout:
```javascript
// Get today's meetings that are NOT completed
const incompleteTodaysMeetings = todaysMeetings.filter(meeting => {
  const isComplete = 
    meeting.meetingStatus === "complete" ||
    meeting.meetingStatus === "Completed" ||
    meeting.meetingStatus === "COMPLETED";
  return !isComplete; // Return meetings that are NOT complete
});
```

### 2. Modal Display
If incomplete meetings exist:
- Shows modal with title: "Incomplete Today's Meetings"
- Displays each meeting with:
  - Company name (e.g., "Tech Solutions Inc")
  - Customer name and details
  - Meeting time
  - Original meeting notes
- Provides individual text area for each meeting's reason

### 3. User Input
User must provide a reason for EACH incomplete meeting:
- Company A: "Client was not available"
- Company B: "Rescheduled to tomorrow"
- Company C: "Technical issues prevented meeting"

### 4. Submit & Logout
When user clicks "Submit All & Logout":

**Step 1**: Update each meeting status to "Incomplete" in external API
```javascript
PATCH /updateFollowUp/{meetingId}
{
  "meetingStatus": "Incomplete"
}
```

**Step 2**: Save incomplete meeting remarks to internal API
```javascript
POST /api/incomplete-meeting-remarks
{
  "employeeId": "user_id",
  "pendingMeetings": [
    {
      "_id": "meeting_id",
      "leadId": "JBDSL-0001",
      "companyName": "Tech Solutions Inc",
      "customerName": "John Doe",
      "incompleteReason": "Client was not available"
    }
  ]
}
```

**Step 3**: Logout user

## Meeting Status Flow

```
Today's Meeting States:
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  "Approved"          → Not started yet                   │
│  "In Progress"       → Meeting ongoing                   │
│  "meeting on-going"  → Meeting ongoing                   │
│  "complete"          → Meeting finished ✓                │
│  "Completed"         → Meeting finished ✓                │
│  "COMPLETED"         → Meeting finished ✓                │
│  "Incomplete"        → Marked incomplete on logout ⚠     │
│                                                          │
└─────────────────────────────────────────────────────────┘

On Logout Check:
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  IF meeting is NOT "complete/Completed/COMPLETED"       │
│  THEN show in incomplete meetings modal                 │
│                                                          │
│  User provides reason → Status changed to "Incomplete"  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Example Scenario

### User's Today's Meetings:
1. **Meeting A** - Tech Solutions Inc (10:00 AM)
   - Status: "Approved" (not started)
   
2. **Meeting B** - Global Corp (2:00 PM)
   - Status: "In Progress" (ongoing)
   
3. **Meeting C** - Innovation Labs (4:00 PM)
   - Status: "complete" (finished)

### On Logout:
- Meeting A and B are shown in modal (not completed)
- Meeting C is NOT shown (already completed)

### User Provides Reasons:
- Meeting A: "Client requested reschedule to next week"
- Meeting B: "Had to leave early due to emergency"

### Result:
- Meeting A status → "Incomplete"
- Meeting B status → "Incomplete"
- Both saved to meeting history with reasons
- User logged out

## API Endpoints

### 1. Update Meeting Status (External API)
```
PATCH https://jbdspower.in/LeafNetServer/api/updateFollowUp/{meetingId}

Body:
{
  "meetingStatus": "Incomplete"
}
```

### 2. Save Incomplete Meeting Remarks (Internal API)
```
POST /api/incomplete-meeting-remarks

Body:
{
  "employeeId": "user_id",
  "reason": "Multiple incomplete meetings",
  "pendingMeetings": [
    {
      "_id": "meeting_id",
      "leadId": "JBDSL-0001",
      "companyName": "Company Name",
      "customerName": "Customer Name",
      "customerEmail": "email@example.com",
      "customerMobile": "1234567890",
      "customerDesignation": "Manager",
      "meetingTime": "10:00 AM",
      "incompleteReason": "Specific reason for this meeting"
    }
  ]
}
```

### 3. Retrieve Incomplete Meetings
```
GET /api/incomplete-meeting-remarks?employeeId={employeeId}

Response:
{
  "meetings": [
    {
      "leadInfo": { "companyName": "Company Name" },
      "meetingDetails": {
        "incomplete": true,
        "incompleteReason": "Specific reason"
      }
    }
  ]
}
```

## Data Stored

For each incomplete meeting:
```json
{
  "sessionId": "logout_incomplete_timestamp_0",
  "employeeId": "user_id",
  "leadId": "JBDSL-0001",
  "leadInfo": {
    "id": "JBDSL-0001",
    "companyName": "Tech Solutions Inc"
  },
  "meetingDetails": {
    "incomplete": true,
    "incompleteReason": "Client was not available",
    "discussion": "Client was not available",
    "customers": [
      {
        "customerName": "John Doe",
        "customerEmail": "john@tech.com",
        "customerMobile": "1234567890",
        "customerDesignation": "CTO"
      }
    ]
  },
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

## Files Modified

1. **client/pages/Index.tsx**
   - Updated `handleLogout()` to check for incomplete today's meetings
   - Updated `handlePendingMeetingsSubmit()` to:
     - Update meeting status to "Incomplete" in external API
     - Save incomplete meeting remarks to internal API
   - Updated modal to pass incomplete meetings instead of pending

2. **client/components/PendingMeetingsModal.tsx**
   - Updated title and description for clarity
   - Shows individual reason fields for each meeting
   - Validates all reasons before submission

3. **server/routes/tracking.ts**
   - Handles individual reasons per meeting
   - Saves with `incomplete: true` flag
   - Links to lead and company information

## Benefits

1. **Accurate Tracking**: Only tracks meetings that were actually scheduled for today
2. **Status Updates**: Meetings are marked as "Incomplete" in the external system
3. **Individual Reasons**: Each company/meeting gets its own specific reason
4. **Data Integrity**: All incomplete meetings properly logged with context
5. **Follow-up Support**: Easy to identify which meetings need rescheduling

## Testing

### Manual Test
1. Start server: `npm run dev`
2. Login with a user account
3. Ensure you have today's meetings (some not completed)
4. Click logout
5. Modal should show only incomplete meetings
6. Fill in reason for each meeting
7. Click "Submit All & Logout"
8. Verify:
   - Meetings marked as "Incomplete" in external API
   - Reasons saved in meeting history
   - User logged out successfully

### Check Results
```javascript
// Check meeting status in external API
GET /getFollowUpHistory?userId={userId}
// Should show meetingStatus: "Incomplete"

// Check meeting history in internal API
GET /api/incomplete-meeting-remarks?employeeId={userId}
// Should return incomplete meetings with reasons
```

## Important Notes

- ✅ Only affects **Today's meetings**
- ✅ Only shows meetings that are **NOT completed**
- ✅ Updates status to **"Incomplete"** in external API
- ✅ Saves **individual reasons** for each meeting
- ✅ Works with **TodaysMeetings** component data
- ✅ Validates all reasons before allowing logout
