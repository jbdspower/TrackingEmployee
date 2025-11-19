# Incomplete Meetings Flow Diagram

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER CLICKS LOGOUT                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ Check for Pending  │
                    │ Meetings Today     │
                    └─────────┬──────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
        ┌────────────────┐        ┌───────────────┐
        │ No Pending     │        │ Has Pending   │
        │ Meetings       │        │ Meetings      │
        └────────┬───────┘        └───────┬───────┘
                 │                        │
                 ▼                        ▼
        ┌────────────────┐        ┌───────────────────────────┐
        │ Logout         │        │ Show Incomplete Meetings  │
        │ Immediately    │        │ Modal                     │
        └────────────────┘        └───────────┬───────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────────┐
                                  │ Display Each Meeting:     │
                                  │ • Company A               │
                                  │   [Reason text area]      │
                                  │ • Company B               │
                                  │   [Reason text area]      │
                                  │ • Company C               │
                                  │   [Reason text area]      │
                                  └───────────┬───────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────────┐
                                  │ User Fills Reasons        │
                                  │ (All Required)            │
                                  └───────────┬───────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────────┐
                                  │ Click "Submit & Logout"   │
                                  └───────────┬───────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────────┐
                                  │ Validate All Reasons      │
                                  │ Filled                    │
                                  └───────────┬───────────────┘
                                              │
                                 ┌────────────┴────────────┐
                                 │                         │
                                 ▼                         ▼
                        ┌────────────────┐        ┌───────────────┐
                        │ Validation     │        │ All Valid     │
                        │ Failed         │        │               │
                        └────────┬───────┘        └───────┬───────┘
                                 │                        │
                                 ▼                        ▼
                        ┌────────────────┐        ┌───────────────────────┐
                        │ Show Error     │        │ POST /api/incomplete- │
                        │ Messages       │        │ meeting-remarks       │
                        └────────────────┘        └───────┬───────────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────────┐
                                              │ Save Each Meeting:        │
                                              │ • Meeting 1 + Reason 1    │
                                              │ • Meeting 2 + Reason 2    │
                                              │ • Meeting 3 + Reason 3    │
                                              └───────────┬───────────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────────┐
                                              │ Mark as incomplete=true   │
                                              │ in Meeting History        │
                                              └───────────┬───────────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────────┐
                                              │ Show Success Toast        │
                                              └───────────┬───────────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────────┐
                                              │ Logout User               │
                                              └───────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ User submits reasons
                             │
                             ▼
                    ┌────────────────────┐
                    │ Index.tsx          │
                    │ handlePendingMeet- │
                    │ ingsSubmit()       │
                    └─────────┬──────────┘
                              │
                              │ Prepare payload:
                              │ {
                              │   employeeId,
                              │   pendingMeetings: [
                              │     { meeting, incompleteReason }
                              │   ]
                              │ }
                              │
                              ▼
                    ┌────────────────────┐
                    │ HTTP POST Request  │
                    │ /api/incomplete-   │
                    │ meeting-remarks    │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────┐
│                             │          BACKEND (Express)       │
│                             ▼                                  │
│                    ┌────────────────────┐                      │
│                    │ tracking.ts        │                      │
│                    │ saveIncomplete-    │                      │
│                    │ MeetingRemark()    │                      │
│                    └─────────┬──────────┘                      │
│                              │                                 │
│                              │ For each meeting:               │
│                              │                                 │
│                              ▼                                 │
│                    ┌────────────────────┐                      │
│                    │ Create History     │                      │
│                    │ Entry:             │                      │
│                    │ {                  │                      │
│                    │   sessionId,       │                      │
│                    │   employeeId,      │                      │
│                    │   leadId,          │                      │
│                    │   meetingDetails: {│                      │
│                    │     incomplete:true│                      │
│                    │     incompleteReason│                     │
│                    │     customers[]    │                      │
│                    │   }                │                      │
│                    │ }                  │                      │
│                    └─────────┬──────────┘                      │
│                              │                                 │
│                              ▼                                 │
│                    ┌────────────────────┐                      │
│                    │ MongoDB            │                      │
│                    │ meetingHistory     │                      │
│                    │ Collection         │                      │
│                    └─────────┬──────────┘                      │
│                              │                                 │
│                              │ Save successful                 │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               │
                               │ Return success response
                               │
                               ▼
                    ┌────────────────────┐
                    │ Frontend receives  │
                    │ success            │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Show toast message │
                    │ Logout user        │
                    └────────────────────┘
```

## Data Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCOMPLETE MEETING RECORD                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  _id: "507f1f77bcf86cd799439011"                                │
│  sessionId: "logout_incomplete_1732012345_0"                    │
│  employeeId: "user_123"                                          │
│  leadId: "JBDSL-0001"                                            │
│  timestamp: "2025-11-19T10:30:00.000Z"                           │
│                                                                  │
│  leadInfo: {                                                     │
│    id: "JBDSL-0001"                                              │
│    companyName: "Tech Solutions Inc"                             │
│  }                                                               │
│                                                                  │
│  meetingDetails: {                                               │
│    incomplete: true                    ◄── FLAG                 │
│    incompleteReason: "Client requested reschedule"              │
│    discussion: "Client requested reschedule"                    │
│    customers: [                                                  │
│      {                                                           │
│        customerName: "John Doe"                                  │
│        customerEmployeeName: "John Doe"                          │
│        customerEmail: "john@tech.com"                            │
│        customerMobile: "1234567890"                              │
│        customerDesignation: "CTO"                                │
│        customerDepartment: ""                                    │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Query Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              RETRIEVING INCOMPLETE MEETINGS                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ GET /api/incomplete│
                    │ -meeting-remarks   │
                    │ ?employeeId=user123│
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ MongoDB Query:     │
                    │ {                  │
                    │   employeeId: "...",│
                    │   "meetingDetails. │
                    │    incomplete": true│
                    │ }                  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Return Array of    │
                    │ Incomplete Meetings│
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Display in UI:     │
                    │ • Company A: reason│
                    │ • Company B: reason│
                    │ • Company C: reason│
                    └────────────────────┘
```

## Key Points

1. **Separate Reasons**: Each meeting gets its own reason field
2. **Validation**: All reasons must be filled before submission
3. **Persistence**: Saved to MongoDB with `incomplete: true` flag
4. **Retrieval**: Can query by employeeId and incomplete flag
5. **Context**: Includes company, customer, and lead information
6. **Timestamp**: Records when the incomplete status was set
