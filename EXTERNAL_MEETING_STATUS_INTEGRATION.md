# External Meeting Status Integration

## Requirement
Pass the `meetingStatus` from the external follow-up API (`https://jbdspower.in/LeafNetServer/api/getFollowUpHistory`) to the analytics API (`https://tracking.jbdspower.in/api/analytics/employee-details/`) so that the external meeting status can be displayed in analytics.

## Implementation

### 1. Added `externalMeetingStatus` Field to Meeting Model

**File**: `server/models/Meeting.ts`

#### Interface
```typescript
export interface IMeeting extends Document {
  employeeId: string;
  location: Location;
  startTime: string;
  endTime?: string;
  clientName?: string;
  notes?: string;
  status: 'started' | 'in-progress' | 'completed';  // Internal status
  trackingSessionId?: string;
  leadId?: string;
  leadInfo?: {
    id: string;
    companyName: string;
    contactName: string;
  };
  meetingDetails?: MeetingDetails;
  externalMeetingStatus?: string;  // 🔹 NEW: Status from external follow-up API
  createdAt: Date;
  updatedAt: Date;
}
```

#### Schema
```typescript
const MeetingSchema = new Schema({
  // ... other fields ...
  externalMeetingStatus: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'meetings'
});
```

### 2. Client Sends External Status When Creating Meeting

**File**: `client/pages/Tracking.tsx`

```typescript
const startMeetingFromFollowUp = async (meetingData, followUpId) => {
  const response = await HttpClient.post("/api/meetings", {
    employeeId: employee.id,
    location: { lat, lng, address },
    clientName: meetingData.clientName,
    notes: meetingData.notes,
    leadId: meetingData.leadId,
    leadInfo: meetingData.leadInfo,
    externalMeetingStatus: "meeting on-going",  // 🔹 NEW: Initial status
  });
  
  // ... rest of the code ...
};
```

### 3. Server Stores External Status

**File**: `server/routes/meetings.ts`

```typescript
export const createMeeting: RequestHandler = async (req, res) => {
  try {
    const { 
      employeeId, 
      location, 
      clientName, 
      notes, 
      leadId, 
      leadInfo, 
      externalMeetingStatus  // 🔹 NEW: Accept external status
    } = req.body;

    const meetingData = {
      employeeId,
      location: { ...location, address, timestamp: new Date().toISOString() },
      startTime: new Date().toISOString(),
      clientName,
      notes,
      status: "in-progress" as const,
      leadId: leadId || undefined,
      leadInfo: leadInfo || undefined,
      externalMeetingStatus: externalMeetingStatus || undefined,  // 🔹 NEW: Store it
    };

    // Save to MongoDB...
  }
};
```

### 4. Analytics API Returns External Status

**File**: `server/routes/analytics.ts`

```typescript
const meetingRecords = employeeMeetings.map((meeting) => ({
  employeeName: "",
  companyName: meeting.clientName || "Unknown Company",
  date: format(new Date(meeting.startTime), "yyyy-MM-dd"),
  leadId: meeting.leadId || "",
  meetingInTime: format(new Date(meeting.startTime), "HH:mm"),
  meetingInLocation: meeting.location?.address || "",
  meetingOutTime: meeting.endTime ? format(new Date(meeting.endTime), "HH:mm") : "",
  meetingOutLocation: meeting.endTime && meeting.location?.endLocation?.address
    ? meeting.location.endLocation.address
    : "",
  totalStayTime: calculateMeetingDuration(meeting.startTime, meeting.endTime),
  discussion: meeting.meetingDetails?.discussion || meeting.notes || "",
  meetingPerson: meeting.meetingDetails?.customers?.length > 0
    ? meeting.meetingDetails.customers.map((c) => c.customerEmployeeName).join(", ")
    : meeting.meetingDetails?.customerEmployeeName || "Unknown",
  meetingStatus: meeting.status || "completed",  // Internal status
  externalMeetingStatus: meeting.externalMeetingStatus || "",  // 🔹 NEW: External status
  incomplete: meeting.meetingDetails?.incomplete || false,
  incompleteReason: meeting.meetingDetails?.incompleteReason || "",
}));
```

### 5. Fixed Type Definitions

**File**: `shared/api.ts`

Added "paused" status to RouteSnapshot and CreateRouteSnapshotRequest interfaces to match TrackingSession:

```typescript
export interface TrackingSession {
  // ... other fields ...
  status: "active" | "completed" | "paused";
}

export interface RouteSnapshot {
  // ... other fields ...
  status: 'active' | 'completed' | 'paused';  // 🔹 Added "paused"
}

export interface CreateRouteSnapshotRequest {
  // ... other fields ...
  status?: 'active' | 'completed' | 'paused';  // 🔹 Added "paused"
}
```

## Data Flow

### 1. Meeting Start from Follow-Up
```
External API: getFollowUpHistory
    ↓
Returns: { meetingStatus: "Not Started", ... }
    ↓
User clicks "Start Meeting"
    ↓
Client: POST /api/meetings
    {
      externalMeetingStatus: "meeting on-going"
    }
    ↓
Server: Saves meeting with externalMeetingStatus
    ↓
Client: PATCH external API
    {
      meetingStatus: "meeting on-going"
    }
```

### 2. Analytics Query
```
GET /api/analytics/employee-details/{employeeId}
    ↓
Server: Fetches meetings from MongoDB
    ↓
Server: Includes externalMeetingStatus in response
    ↓
Response:
{
  "meetingRecords": [{
    "meetingStatus": "completed",  // Internal status
    "externalMeetingStatus": "meeting on-going"  // External status
  }]
}
```

## External Meeting Status Values

Based on the external API, possible values include:
- `"Not Started"` - Meeting hasn't started yet
- `"meeting on-going"` - Meeting is currently in progress
- `"complete"` / `"Completed"` / `"COMPLETED"` - Meeting finished successfully
- `"Incomplete"` - Meeting marked as incomplete
- `"Pending"` - Awaiting approval
- `"Approved"` - Meeting approved

## API Response Example

### Before
```json
{
  "meetingRecords": [{
    "companyName": "ABC Corp",
    "meetingInTime": "10:00",
    "meetingOutTime": "11:00",
    "meetingStatus": "completed",
    "discussion": "Discussed product features"
  }]
}
```

### After
```json
{
  "meetingRecords": [{
    "companyName": "ABC Corp",
    "meetingInTime": "10:00",
    "meetingOutTime": "11:00",
    "meetingStatus": "completed",
    "externalMeetingStatus": "meeting on-going",  // 🔹 NEW
    "discussion": "Discussed product features"
  }]
}
```

## Benefits

1. **Dual Status Tracking**
   - `meetingStatus`: Internal tracking system status
   - `externalMeetingStatus`: External follow-up system status

2. **Status Synchronization**
   - Can compare internal vs external status
   - Identify discrepancies
   - Better reporting and analytics

3. **Flexibility**
   - External status can have different values than internal
   - Supports various external system statuses
   - No breaking changes to existing functionality

## Testing

### Test 1: Start Meeting from Follow-Up
1. [ ] Start meeting from Today's Meetings
2. [ ] Check MongoDB: meeting has `externalMeetingStatus: "meeting on-going"`
3. [ ] Check analytics API: `externalMeetingStatus` is returned

### Test 2: Complete Meeting
1. [ ] End meeting
2. [ ] External API updates to "complete"
3. [ ] Check analytics API: shows both statuses

### Test 3: Manual Meeting (Not from Follow-Up)
1. [ ] Start meeting manually (not from follow-up)
2. [ ] Check MongoDB: `externalMeetingStatus` is undefined or empty
3. [ ] Check analytics API: `externalMeetingStatus` is empty string

## Files Modified
1. `server/models/Meeting.ts` - Added externalMeetingStatus field
2. `server/routes/meetings.ts` - Accept and store externalMeetingStatus
3. `server/routes/analytics.ts` - Return externalMeetingStatus in response
4. `client/pages/Tracking.tsx` - Send externalMeetingStatus when creating meeting
5. `shared/api.ts` - Fixed type definitions (added "paused" status)

## Related Documentation
- `ATTENDANCE_TRACKING_FIX.md` - Attendance tracking implementation
- `COMPLETE_FIX_SUMMARY.md` - Overall summary
