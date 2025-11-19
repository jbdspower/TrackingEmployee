# Incomplete Meetings Feature

## Overview
This feature allows users to provide separate reasons for each incomplete meeting when logging out. When a user has pending meetings scheduled for today that haven't been completed, they will be prompted to provide a reason for each meeting before logging out.

## How It Works

### 1. Logout Detection
When a user clicks the logout button in the Index page:
- The system checks if there are any pending meetings for today
- Pending meetings are those with status "Pending" and scheduled for today's date
- If pending meetings exist, a modal is displayed instead of immediate logout

### 2. Incomplete Meetings Modal
The modal displays:
- A list of all pending meetings
- Each meeting shows:
  - Company name
  - Customer name
  - Meeting time
  - Original meeting notes/remarks
- A separate text area for each meeting to provide a reason

### 3. Validation
- All meetings must have a reason provided
- Empty reasons are not accepted
- Visual feedback shows which meetings still need reasons

### 4. Data Storage
When submitted:
- Each incomplete meeting is saved to the meeting history with:
  - `incomplete: true` flag
  - Individual `incompleteReason` for that specific meeting
  - Company and customer details
  - Lead ID for tracking
  - Employee ID
  - Timestamp

### 5. API Integration
The data is saved via:
- **Endpoint**: `POST /api/incomplete-meeting-remarks`
- **Payload**:
```json
{
  "employeeId": "user_id",
  "reason": "General reason (optional)",
  "pendingMeetings": [
    {
      "_id": "meeting_id",
      "leadId": "JBDSL-0001",
      "companyName": "Company A",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerMobile": "1234567890",
      "customerDesignation": "Manager",
      "meetingTime": "10:00 AM",
      "incompleteReason": "Client rescheduled to next week"
    },
    {
      "_id": "meeting_id_2",
      "leadId": "JBDSL-0002",
      "companyName": "Company B",
      "customerName": "Jane Smith",
      "incompleteReason": "Technical issues prevented meeting"
    }
  ]
}
```

### 6. Retrieving Incomplete Meetings
To fetch incomplete meetings for an employee:
- **Endpoint**: `GET /api/incomplete-meeting-remarks?employeeId={employeeId}`
- **Response**:
```json
{
  "meetings": [
    {
      "_id": "history_id",
      "sessionId": "logout_incomplete_timestamp",
      "employeeId": "user_id",
      "leadId": "JBDSL-0001",
      "leadInfo": {
        "id": "JBDSL-0001",
        "companyName": "Company A"
      },
      "meetingDetails": {
        "incomplete": true,
        "incompleteReason": "Client rescheduled to next week",
        "discussion": "Client rescheduled to next week",
        "customers": [
          {
            "customerName": "John Doe",
            "customerEmployeeName": "John Doe",
            "customerEmail": "john@example.com",
            "customerMobile": "1234567890",
            "customerDesignation": "Manager"
          }
        ]
      },
      "timestamp": "2025-11-19T10:30:00.000Z"
    }
  ]
}
```

## Files Modified

### Client-Side
1. **client/components/PendingMeetingsModal.tsx**
   - Enhanced to show individual text areas for each meeting
   - Added validation for each meeting's reason
   - Improved UI with company/customer details
   - Added ScrollArea for better UX with multiple meetings

2. **client/pages/Index.tsx**
   - Updated `handlePendingMeetingsSubmit` to handle array of meetings with reasons
   - Added API call to save incomplete meeting remarks
   - Enhanced error handling and user feedback

### Server-Side
3. **server/routes/tracking.ts**
   - Updated `saveIncompleteMeetingRemark` to handle individual reasons per meeting
   - Enhanced logging for better debugging
   - Improved data structure to store separate reasons

## Usage Example

### User Flow
1. User has 3 pending meetings for today
2. User clicks "Logout" button
3. Modal appears showing all 3 meetings
4. User provides reasons:
   - Meeting 1 (Company A): "Client requested reschedule"
   - Meeting 2 (Company B): "Waiting for approval from management"
   - Meeting 3 (Company C): "Technical issues with video call"
5. User clicks "Submit All & Logout"
6. System saves all 3 incomplete meeting records with individual reasons
7. User is logged out successfully

### Viewing Incomplete Meetings
Incomplete meetings can be viewed in:
- Meeting history (filtered by `incomplete: true`)
- Analytics dashboard
- Employee details view

The data includes:
- Which meetings were incomplete
- Specific reason for each meeting
- When the incomplete status was recorded
- Associated lead and company information

## Benefits
1. **Accountability**: Track why meetings weren't completed
2. **Individual Tracking**: Separate reasons for each company/meeting
3. **Data Integrity**: All incomplete meetings are properly logged
4. **Follow-up**: Easy to identify which meetings need rescheduling
5. **Analytics**: Can analyze patterns in incomplete meetings

## Technical Notes
- Uses MongoDB for persistent storage with in-memory fallback
- Validates all required fields before submission
- Maintains referential integrity with lead IDs
- Timestamps all incomplete meeting records
- Supports both single and multiple incomplete meetings
