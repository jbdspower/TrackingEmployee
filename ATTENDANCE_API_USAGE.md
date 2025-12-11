# Attendance API Usage Guide

## Overview
The `save-attendance` API now includes an `attendenceCreated` field to track who created the attendance record.

## Field Details

### `attendenceCreated`
- **Type**: `string | null`
- **Purpose**: Identifies who created the attendance record
- **Values**:
  - `null` - When attendance is created from the Tracking Employee app (default)
  - `userId` - When attendance is created from the CRM Dashboard

## API Endpoint

### Save Attendance
**Endpoint**: `POST /api/analytics/save-attendance`

**Request Body**:
```json
{
  "employeeId": "string (required)",
  "date": "string (required, YYYY-MM-DD format)",
  "attendanceStatus": "string (required, one of: full_day, half_day, off, short_leave, ot)",
  "attendanceReason": "string (optional)",
  "attendenceCreated": "string | null (optional, defaults to null)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Attendance saved successfully",
  "data": {
    "id": "mongodb_id",
    "employeeId": "employee_id",
    "date": "2024-12-10",
    "attendanceStatus": "full_day",
    "attendanceReason": "Regular work day",
    "attendenceCreated": null,
    "savedAt": "2024-12-10T10:30:00.000Z"
  }
}
```

## Usage Examples

### From Tracking Employee App (Default)
```typescript
import { HttpClient } from './lib/httpClient';

// Save attendance from tracking employee app
// attendenceCreated will default to null
const response = await HttpClient.post('/api/analytics/save-attendance', {
  employeeId: 'emp_123',
  date: '2024-12-10',
  attendanceStatus: 'full_day',
  attendanceReason: 'Regular work day'
  // attendenceCreated is not provided, will default to null
});

const result = await response.json();
console.log(result);
```

### From Tracking Employee App (Explicit null)
```typescript
// Explicitly pass null for attendenceCreated
const response = await HttpClient.post('/api/analytics/save-attendance', {
  employeeId: 'emp_123',
  date: '2024-12-10',
  attendanceStatus: 'full_day',
  attendanceReason: 'Regular work day',
  attendenceCreated: null // Explicitly set to null
});
```

### From CRM Dashboard
```typescript
// Get logged-in user ID from localStorage
const user = JSON.parse(localStorage.getItem("user") || "{}");
const loggedInUserId = user?._id || null;

// When saving from CRM dashboard, pass the logged-in userId
const response = await HttpClient.post('/api/analytics/save-attendance', {
  employeeId: 'emp_123',
  date: '2024-12-10',
  attendanceStatus: 'half_day',
  attendanceReason: 'Medical appointment',
  attendenceCreated: loggedInUserId // Logged-in user's ID from localStorage
});
```

## Database Schema

The Attendance model now includes:

```typescript
{
  employeeId: string;
  date: string; // YYYY-MM-DD format
  attendanceStatus: 'full_day' | 'half_day' | 'off' | 'short_leave' | 'ot';
  attendanceReason: string;
  attendenceCreated: string | null; // NEW FIELD
  createdAt: Date;
  updatedAt: Date;
}
```

## Important Notes

1. **Default Behavior**: If `attendenceCreated` is not provided in the request, it will automatically default to `null`
2. **Tracking Employee**: Always pass `null` or omit the field when saving from the tracking employee app
3. **CRM Dashboard**: Always pass the userId when saving from the CRM dashboard
4. **Upsert Logic**: The API uses upsert logic, so if an attendance record already exists for the same employeeId and date, it will be updated
5. **Validation**: The API validates:
   - Required fields (employeeId, date, attendanceStatus)
   - Date format (YYYY-MM-DD)
   - Valid attendance status values

## Get Attendance

**Endpoint**: `GET /api/analytics/attendance`

**Query Parameters**:
- `employeeId` (optional): Filter by employee ID
- `date` (optional): Get attendance for a specific date
- `startDate` (optional): Start of date range
- `endDate` (optional): End of date range

**Example**:
```typescript
// Get attendance for a specific employee
const response = await HttpClient.get('/api/analytics/attendance?employeeId=emp_123');
const result = await response.json();

// Get attendance for a date range
const response = await HttpClient.get(
  '/api/analytics/attendance?employeeId=emp_123&startDate=2024-12-01&endDate=2024-12-10'
);
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "mongodb_id",
      "employeeId": "emp_123",
      "date": "2024-12-10",
      "attendanceStatus": "full_day",
      "attendanceReason": "Regular work day",
      "attendenceCreated": null,
      "createdAt": "2024-12-10T10:30:00.000Z",
      "updatedAt": "2024-12-10T10:30:00.000Z"
    }
  ]
}
```
