# All Employees Details API

## Overview
This new API endpoint returns attendance and meeting details for **all employees** in the same format as the existing single-employee endpoint. This allows you to fetch comprehensive data for all employees in a single request.

## Endpoint

```
GET /api/analytics/all-employees-details
```

**Production URL:**
```
https://tracking.jbdspower.in/api/analytics/all-employees-details
```

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `dateRange` | string | No | Date range filter | `all`, `today`, `yesterday`, `week`, `month`, `custom` |
| `startDate` | string | Conditional | Start date for custom range (YYYY-MM-DD) | `2024-12-01` |
| `endDate` | string | Conditional | End date for custom range (YYYY-MM-DD) | `2024-12-11` |

**Note:** `startDate` and `endDate` are required when `dateRange=custom`

## Response Format

```json
{
  "success": true,
  "dateRange": {
    "start": "2024-12-01T00:00:00.000Z",
    "end": "2024-12-11T23:59:59.999Z",
    "label": "custom"
  },
  "totalEmployees": 25,
  "employees": [
    {
      "employeeId": "67daa55d9c4abb36045d5bfe",
      "employeeName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210",
      "designation": "Sales Manager",
      "department": "Sales",
      "companyName": "JBDS Power",
      "reportTo": "Jane Smith",
      "dayRecords": [
        {
          "date": "2024-12-11",
          "totalMeetings": 3,
          "startLocationTime": "2024-12-11T09:00:00.000Z",
          "startLocationAddress": "New Delhi, India",
          "outLocationTime": "2024-12-11T17:30:00.000Z",
          "outLocationAddress": "Mumbai, Maharashtra",
          "totalDutyHours": 8.5,
          "meetingTime": 6.2,
          "travelAndLunchTime": 2.3,
          "attendanceAddedBy": "Admin User"
        }
      ],
      "meetingRecords": [
        {
          "employeeName": "John Doe",
          "companyName": "Tech Corp",
          "date": "2024-12-11",
          "leadId": "LEAD-001",
          "meetingInTime": "09:00",
          "meetingInLocation": "New Delhi, India",
          "meetingOutTime": "11:30",
          "meetingOutLocation": "New Delhi, India",
          "totalStayTime": 2.5,
          "discussion": "Discussed product requirements",
          "meetingPerson": "Rajesh Kumar",
          "meetingStatus": "completed",
          "externalMeetingStatus": "",
          "incomplete": false,
          "incompleteReason": ""
        }
      ]
    }
  ]
}
```

## Response Fields

### Root Level
- `success` (boolean): Indicates if the request was successful
- `dateRange` (object): Contains the date range information
  - `start` (string): Start date in ISO format
  - `end` (string): End date in ISO format
  - `label` (string): The date range label used
- `totalEmployees` (number): Total number of employees in the response
- `employees` (array): Array of employee data objects

### Employee Object
- `employeeId` (string): Unique employee identifier
- `employeeName` (string): Employee's full name
- `email` (string): Employee's email address
- `phone` (string): Employee's phone number
- `designation` (string): Employee's job title
- `department` (string): Employee's department
- `companyName` (string): Company name
- `reportTo` (string): Name of the reporting manager
- `dayRecords` (array): Daily attendance summary records
- `meetingRecords` (array): Individual meeting records

### Day Record Object
- `date` (string): Date in YYYY-MM-DD format
- `totalMeetings` (number): Number of meetings on this day
- `startLocationTime` (string): First meeting start time (ISO format)
- `startLocationAddress` (string): Location of first meeting
- `outLocationTime` (string): Last meeting end time (ISO format)
- `outLocationAddress` (string): Location where last meeting ended
- `totalDutyHours` (number): Total working hours
- `meetingTime` (number): Total time spent in meetings (hours)
- `travelAndLunchTime` (number): Time spent on travel and breaks (hours)
- `attendanceAddedBy` (string): Name of person who marked attendance

### Meeting Record Object
- `employeeName` (string): Employee's name
- `companyName` (string): Client company name
- `date` (string): Meeting date (YYYY-MM-DD)
- `leadId` (string): Associated lead ID
- `meetingInTime` (string): Meeting start time (HH:mm)
- `meetingInLocation` (string): Meeting start location
- `meetingOutTime` (string): Meeting end time (HH:mm) or "In Progress"
- `meetingOutLocation` (string): Meeting end location
- `totalStayTime` (number): Meeting duration in hours
- `discussion` (string): Meeting notes/discussion
- `meetingPerson` (string): Client contact person name
- `meetingStatus` (string): Meeting status (completed, in-progress, started)
- `externalMeetingStatus` (string): Status from external follow-up system
- `incomplete` (boolean): Whether meeting is marked incomplete
- `incompleteReason` (string): Reason if meeting is incomplete

## Usage Examples

### Example 1: Get All Employees Data (All Time)
```bash
curl "https://tracking.jbdspower.in/api/analytics/all-employees-details?dateRange=all"
```

### Example 2: Get Today's Data for All Employees
```bash
curl "https://tracking.jbdspower.in/api/analytics/all-employees-details?dateRange=today"
```

### Example 3: Get Data for Custom Date Range
```bash
curl "https://tracking.jbdspower.in/api/analytics/all-employees-details?dateRange=custom&startDate=2024-12-01&endDate=2024-12-11"
```

### Example 4: Using JavaScript/Fetch
```javascript
const fetchAllEmployeesDetails = async (dateRange = 'all') => {
  const url = `https://tracking.jbdspower.in/api/analytics/all-employees-details?dateRange=${dateRange}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Total Employees: ${data.totalEmployees}`);
    
    data.employees.forEach(employee => {
      console.log(`${employee.employeeName}: ${employee.meetingRecords.length} meetings`);
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

// Usage
fetchAllEmployeesDetails('today');
```

### Example 5: Using PowerShell
```powershell
$response = Invoke-RestMethod -Uri "https://tracking.jbdspower.in/api/analytics/all-employees-details?dateRange=all" -Method Get

Write-Host "Total Employees: $($response.totalEmployees)"

foreach ($employee in $response.employees) {
    Write-Host "$($employee.employeeName): $($employee.meetingRecords.Count) meetings"
}
```

## Comparison with Single Employee Endpoint

### Single Employee Endpoint
```
GET /api/analytics/employee-details/:employeeId?dateRange=all
```
Returns data for **one specific employee**.

### All Employees Endpoint (NEW)
```
GET /api/analytics/all-employees-details?dateRange=all
```
Returns data for **all employees** in the same format.

## Key Features

1. **Same Format**: The data structure for each employee matches exactly with the single-employee endpoint
2. **Efficient**: Get all employee data in a single API call instead of multiple requests
3. **Flexible Date Ranges**: Supports all the same date range options as the single-employee endpoint
4. **Complete Data**: Includes both day-level summaries and individual meeting records
5. **Attendance Tracking**: Shows who marked the attendance for each day
6. **Meeting Status**: Includes in-progress meetings and incomplete meeting tracking

## Testing

Run the provided test script to verify the endpoint:

```powershell
.\test-all-employees-details.ps1
```

This will test:
- All-time data retrieval
- Today's data retrieval
- Custom date range retrieval

## Notes

- The existing single-employee endpoint remains unchanged and continues to work as before
- Both endpoints share the same underlying logic and data sources
- The response can be large if you have many employees with extensive meeting history
- Consider using date range filters to limit the response size when needed
- The endpoint respects the same date filtering logic as the single-employee endpoint

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK`: Successful request
- `500 Internal Server Error`: Server error occurred

Error response format:
```json
{
  "error": "Failed to fetch all employees details"
}
```
