# Attendance API Documentation

## Overview
The Attendance API allows you to save and retrieve employee attendance records with status and comments.

## Endpoints

### 1. Save Attendance
**POST** `/api/analytics/save-attendance`

Save or update attendance record for an employee on a specific date.

**Request Body:**
```json
{
  "employeeId": "67daa55d9c4abb36045d5bfe",
  "date": "2025-11-14",
  "attendanceStatus": "half_day",
  "attendanceReason": "Medical appointment"
}
```

**Attendance Status Options:**
- `full_day` - Full day present
- `half_day` - Half day present
- `off` - Day off
- `short_leave` - Short leave
- `ot` - Overtime

**Response:**
```json
{
  "success": true,
  "message": "Attendance saved successfully",
  "data": {
    "id": "691c192bd931a32dda0d5a6b",
    "employeeId": "67daa55d9c4abb36045d5bfe",
    "date": "2025-11-14",
    "attendanceStatus": "half_day",
    "attendanceReason": "Medical appointment",
    "savedAt": "2025-11-18T07:04:01.104Z"
  }
}
```

### 2. Get Attendance Records
**GET** `/api/analytics/attendance`

Retrieve attendance records with optional filters.

**Query Parameters:**
- `employeeId` (optional) - Filter by specific employee
- `date` (optional) - Filter by specific date (YYYY-MM-DD)
- `startDate` (optional) - Start of date range (YYYY-MM-DD)
- `endDate` (optional) - End of date range (YYYY-MM-DD)

**Examples:**

Get all attendance for an employee:
```
GET /api/analytics/attendance?employeeId=67daa55d9c4abb36045d5bfe
```

Get attendance for a specific date:
```
GET /api/analytics/attendance?date=2025-11-14
```

Get attendance for a date range:
```
GET /api/analytics/attendance?employeeId=67daa55d9c4abb36045d5bfe&startDate=2025-11-01&endDate=2025-11-30
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "691c192bd931a32dda0d5a6b",
      "employeeId": "67daa55d9c4abb36045d5bfe",
      "date": "2025-11-14",
      "attendanceStatus": "half_day",
      "attendanceReason": "Medical appointment",
      "savedAt": "2025-11-18T07:04:01.104Z"
    },
    {
      "id": "691c192bd931a32dda0d5a6c",
      "employeeId": "67daa55d9c4abb36045d5bfe",
      "date": "2025-11-13",
      "attendanceStatus": "full_day",
      "attendanceReason": "",
      "savedAt": "2025-11-17T08:30:00.000Z"
    }
  ]
}
```

## Integration in Analytics Dashboard

The attendance data is automatically fetched and displayed in the Analytics Dashboard when viewing employee details:

1. **Day Records Table**: Shows attendance status and reason for each day
2. **Edit Functionality**: Click the edit icon to modify attendance status and add/update comments
3. **Save**: Click the save icon to persist changes
4. **Date Filtering**: Attendance records respect the dashboard's date range filters

## Usage in Client Code

```typescript
// Save attendance
const response = await HttpClient.post("/api/analytics/save-attendance", {
  employeeId: "67daa55d9c4abb36045d5bfe",
  date: "2025-11-14",
  attendanceStatus: "half_day",
  attendanceReason: "Medical appointment"
});

// Get attendance records
const attendanceResponse = await HttpClient.get(
  `/api/analytics/attendance?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`
);

if (attendanceResponse.ok) {
  const data = await attendanceResponse.json();
  console.log(`Found ${data.count} attendance records`);
  // data.data contains the array of attendance records
}
```

## Testing

Run the test script to verify the API:
```powershell
.\test-attendance-api.ps1
```

Make sure your development server is running on port 3002 before running tests.
