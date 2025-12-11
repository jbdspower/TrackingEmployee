# Troubleshooting: Attendance Added By Field

## Issue: "Attendance Added By" field shows "-" after saving

### Root Cause
The `attendenceCreated` field needs to be:
1. Sent from frontend to backend
2. Saved in MongoDB
3. Fetched back with employee details
4. Mapped from user ID to user name

### Solution Implemented

#### 1. Frontend sends user ID (`client/pages/Dashboard.tsx`)
```typescript
const user = JSON.parse(localStorage.getItem("user") || "{}");
const loggedInUserId = user?._id || null;

await HttpClient.post("/api/analytics/save-attendance", {
  employeeId: selectedEmployee,
  date,
  attendanceStatus: editData.attendanceStatus,
  attendanceReason: editData.attendanceReason,
  attendenceCreated: loggedInUserId, // ✅ Sending user ID
});
```

#### 2. Backend saves to MongoDB (`server/routes/analytics.ts`)
```typescript
const savedAttendance = await Attendance.findOneAndUpdate(
  { employeeId, date },
  {
    employeeId,
    date,
    attendanceStatus,
    attendanceReason: attendanceReason || "",
    attendenceCreated: attendenceCreated !== undefined ? attendenceCreated : null
  },
  { new: true, upsert: true, runValidators: true }
);
```

#### 3. Frontend refetches employee details after save
```typescript
if (response.ok) {
  const result = await response.json();
  console.log(`✅ Attendance saved successfully:`, result);
  
  // ✅ Refetch employee details to get updated attendanceAddedBy field
  console.log(`🔄 Refetching employee details to update attendanceAddedBy...`);
  const employeeName = analytics.find((emp) => emp.employeeId === selectedEmployee)?.employeeName || "Employee";
  await handleEmployeeClick(selectedEmployee, employeeName);
  
  handleCancelAttendanceEdit(date);
}
```

#### 4. Backend maps user ID to name (`server/routes/analytics.ts`)
```typescript
// Fetch external users to map attendenceCreated IDs to names
const externalUsers = await fetchExternalUsers();
const userMap = new Map(externalUsers.map(user => [user._id, user.name]));

// Get attendance info for this date
const attendance = attendanceRecords.find(att => att.date === date);
const attendanceAddedBy = attendance?.attendenceCreated 
  ? userMap.get(attendance.attendenceCreated) || attendance.attendenceCreated
  : null;
```

### Verification Steps

#### Step 1: Check if user is logged in
Open browser console and run:
```javascript
const user = JSON.parse(localStorage.getItem("user") || "{}");
console.log("Logged in user:", user);
console.log("User ID:", user?._id);
```

**Expected**: Should show user object with `_id` field

#### Step 2: Check API request payload
1. Open browser DevTools → Network tab
2. Edit and save attendance
3. Find the `save-attendance` request
4. Check the payload

**Expected payload**:
```json
{
  "employeeId": "67daa55d9c4abb36045d5bfe",
  "date": "2025-12-10",
  "attendanceStatus": "short_leave",
  "attendanceReason": "adsfadsf adfskj;sdf",
  "attendenceCreated": "67daa55d9c4abb36045d5bfe"  // ✅ Should be present
}
```

#### Step 3: Check API response
Look at the response from `save-attendance`

**Expected response**:
```json
{
  "success": true,
  "message": "Attendance saved successfully",
  "data": {
    "id": "693920336c3e7f2f612adc09",
    "employeeId": "67daa55d9c4abb36045d5bfe",
    "date": "2025-12-10",
    "attendanceStatus": "short_leave",
    "attendanceReason": "adsfadsf adfskj;sdf",
    "attendenceCreated": "67daa55d9c4abb36045d5bfe",  // ✅ Should be present
    "savedAt": "2025-12-10T11:19:01.084Z"
  }
}
```

#### Step 4: Check employee details refetch
After saving, check the Network tab for `employee-details` request

**Expected**: Should see a new request to `/api/analytics/employee-details/...`

#### Step 5: Check employee details response
Look at the `employee-details` response

**Expected in dayRecords**:
```json
{
  "dayRecords": [
    {
      "date": "2025-12-10",
      "totalMeetings": 3,
      "startLocationTime": "2025-12-10T09:30:00Z",
      "outLocationTime": "2025-12-10T16:45:00Z",
      "attendanceAddedBy": "John Doe"  // ✅ Should show user name, not ID
    }
  ]
}
```

#### Step 6: Check server logs
Look at the server console for these logs:
```
Saving attendance for employee 67daa55d9c4abb36045d5bfe on 2025-12-10: {
  attendanceStatus: 'short_leave',
  attendanceReason: 'adsfadsf adfskj;sdf',
  attendenceCreated: '67daa55d9c4abb36045d5bfe'
}
Attendance saved to MongoDB: 693920336c3e7f2f612adc09
Attendance attendenceCreated value: 67daa55d9c4abb36045d5bfe
```

And when fetching employee details:
```
Found 1 attendance records for employee 67daa55d9c4abb36045d5bfe
Day record for 2025-12-10: 3 meetings, 5.50 meeting hours, 0 tracking sessions, attendance added by: John Doe
```

### Common Issues

#### Issue 1: User not logged in
**Symptom**: `attendenceCreated` is `null` in request
**Solution**: Make sure user is logged in and stored in localStorage

#### Issue 2: User ID not mapping to name
**Symptom**: `attendanceAddedBy` shows user ID instead of name
**Solution**: Check if external user API is accessible and returning data

#### Issue 3: Field not updating in UI
**Symptom**: Field shows "-" even after saving
**Solution**: Check if employee details are being refetched after save (should see network request)

#### Issue 4: MongoDB not saving field
**Symptom**: Field is `null` in database
**Solution**: Check Attendance model schema includes `attendenceCreated` field

### Quick Fix Commands

#### Check MongoDB data:
```javascript
// In MongoDB shell or Compass
db.attendance.find({ 
  employeeId: "67daa55d9c4abb36045d5bfe",
  date: "2025-12-10"
}).pretty()

// Should show attendenceCreated field
```

#### Clear and retry:
```javascript
// In browser console
localStorage.clear();
// Then log in again and retry
```

### Success Indicators

✅ Request payload includes `attendenceCreated` with user ID
✅ Response includes `attendenceCreated` with user ID  
✅ Employee details refetch automatically after save
✅ `attendanceAddedBy` shows user name (not ID)
✅ UI displays the name in "Attendance Added By" column
