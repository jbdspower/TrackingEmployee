# Attendance Field Update - attendenceCreated

## Summary
Added a new field `attendenceCreated` to the attendance API to track who created the attendance record. This field will be `null` by default for the tracking employee app and will contain a `userId` when created from the CRM dashboard.

## Changes Made

### 1. Database Model Update
**File**: `TrackingEmployee/server/models/Attendance.ts`

- Added `attendenceCreated` field to the `IAttendance` interface
- Added `attendenceCreated` field to the Attendance schema with default value of `null`

```typescript
attendenceCreated: {
  type: String,
  default: null // null for tracking employee, userId from CRM dashboard
}
```

### 2. API Endpoint Update
**File**: `TrackingEmployee/server/routes/analytics.ts`

- Updated `saveAttendance` function to accept `attendenceCreated` parameter
- Added logic to default to `null` if not provided
- Updated response to include `attendenceCreated` field

**Key Changes**:
```typescript
const { employeeId, date, attendanceStatus, attendanceReason, attendenceCreated } = req.body;

// In the MongoDB update
attendenceCreated: attendenceCreated !== undefined ? attendenceCreated : null
```

### 3. TypeScript Types Update
**File**: `TrackingEmployee/shared/api.ts`

Added new interfaces for attendance:
- `AttendanceRecord` - Complete attendance record structure
- `SaveAttendanceRequest` - Request body for saving attendance
- `SaveAttendanceResponse` - Response structure for save operation
- `GetAttendanceResponse` - Response structure for get operation

## Usage

### From Tracking Employee App
```typescript
// Option 1: Omit the field (will default to null)
await HttpClient.post('/api/analytics/save-attendance', {
  employeeId: 'emp_123',
  date: '2024-12-10',
  attendanceStatus: 'full_day',
  attendanceReason: 'Regular work day'
});

// Option 2: Explicitly pass null
await HttpClient.post('/api/analytics/save-attendance', {
  employeeId: 'emp_123',
  date: '2024-12-10',
  attendanceStatus: 'full_day',
  attendanceReason: 'Regular work day',
  attendenceCreated: null
});
```

### From CRM Dashboard (Implemented)
```typescript
// Get logged-in user ID from localStorage
const user = JSON.parse(localStorage.getItem("user") || "{}");
const loggedInUserId = user?._id || null;

await HttpClient.post('/api/analytics/save-attendance', {
  employeeId: 'emp_123',
  date: '2024-12-10',
  attendanceStatus: 'half_day',
  attendanceReason: 'Medical appointment',
  attendenceCreated: loggedInUserId // Logged-in user's ID
});
```

**Note**: The CRM Dashboard implementation automatically retrieves the logged-in user's ID from localStorage and passes it in the `attendenceCreated` field.

## Benefits

1. **Audit Trail**: Track who created each attendance record
2. **Differentiation**: Distinguish between self-reported (tracking app) and admin-created (CRM dashboard) attendance
3. **Backward Compatible**: Existing code will continue to work as the field defaults to `null`
4. **Flexible**: Can be extended to track other user types in the future

## Testing

To test the changes:

1. **Test with null (tracking employee)**:
```bash
curl -X POST http://localhost:5000/api/analytics/save-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "test_emp_1",
    "date": "2024-12-10",
    "attendanceStatus": "full_day",
    "attendanceReason": "Regular work"
  }'
```

2. **Test with userId (CRM dashboard)**:
```bash
curl -X POST http://localhost:5000/api/analytics/save-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "test_emp_1",
    "date": "2024-12-10",
    "attendanceStatus": "half_day",
    "attendanceReason": "Medical leave",
    "attendenceCreated": "admin_123"
  }'
```

3. **Verify the data**:
```bash
curl http://localhost:5000/api/analytics/attendance?employeeId=test_emp_1
```

## Migration Notes

- **No migration required**: The field has a default value of `null`, so existing records will automatically have this value
- **Backward compatible**: Existing API calls without this field will continue to work
- **Database indexes**: No new indexes needed as this field is not used for querying

## Files Modified

1. `TrackingEmployee/server/models/Attendance.ts` - Database model
2. `TrackingEmployee/server/routes/analytics.ts` - API endpoint
3. `TrackingEmployee/shared/api.ts` - TypeScript types
4. `TrackingEmployee/client/pages/Dashboard.tsx` - Client implementation to pass logged-in user ID

## Documentation Created

1. `ATTENDANCE_API_USAGE.md` - Comprehensive API usage guide
2. `ATTENDANCE_FIELD_UPDATE.md` - This file, summary of changes
3. `ATTENDANCE_CREATOR_TRACKING.md` - Detailed implementation guide for creator tracking
