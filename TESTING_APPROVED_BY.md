# Testing Approved By Feature

## Prerequisites
1. **Restart the server** - This is critical! Schema changes require a server restart.
2. Have a logged-in user with a valid user ID in localStorage
3. Have at least one meeting in the database

## Step-by-Step Testing

### 1. Test Backend API Directly

#### Test the approval endpoint:
```bash
curl -X PUT http://localhost:3000/api/meetings/YOUR_MEETING_ID/approval \
  -H "Content-Type: application/json" \
  -d '{
    "approvalStatus": "ok",
    "approvalReason": "Test approval",
    "approvedBy": "YOUR_USER_ID"
  }'
```

Expected response should include:
```json
{
  "success": true,
  "approvalStatus": "ok",
  "approvalReason": "Test approval",
  "approvedBy": "YOUR_USER_ID"
}
```

#### Test the GET endpoint:
```bash
curl http://localhost:3000/api/meetings/YOUR_MEETING_ID
```

Expected response should include `approvedBy` field.

#### Test employee details API:
```bash
curl "http://localhost:3000/api/analytics/employee-details/YOUR_EMPLOYEE_ID?dateRange=today"
```

Expected response should include in `meetingRecords`:
```json
{
  "meetingRecords": [
    {
      "approvalStatus": "ok",
      "approvalReason": "Test approval",
      "approvedBy": "USER_ID",
      "approvedByName": "User Name"
    }
  ]
}
```

#### Test all employees details API:
```bash
curl "http://localhost:3000/api/analytics/all-employees-details?dateRange=today"
```

Expected response should include `approvedBy` and `approvedByName` in meeting records for each employee.

### 2. Test Frontend

1. **Open Browser Console** (F12)
2. **Login to Dashboard**
3. **Select an employee with meetings**
4. **Check console logs** for:
   ```
   🔍 Approval fields: { approvalStatus, approvalReason, approvedBy, approvedByName }
   ```

5. **Approve a meeting:**
   - Click Edit on a meeting's approval
   - Select status (OK/Not OK)
   - Enter reason
   - Click Save
   - Check console for: `👤 Logged-in user ID: YOUR_USER_ID`

6. **Verify in table:**
   - "Approved By" column should show the user's name
   - If it shows "-", the field is not being received

### 3. Check Server Logs

When you save an approval, you should see:
```
📝 Updating meeting approval MEETING_ID: { approvalStatus, approvalReason, approvedBy }
📝 approvedBy value type: string value: USER_ID
📝 Update data being sent to MongoDB: { approvalStatus, approvalReason, approvedBy }
✅ Meeting approval updated: MEETING_ID
✅ Approved by user ID stored in DB: USER_ID
✅ Full updated meeting: { id, approvalStatus, approvalReason, approvedBy }
```

### 4. Verify in MongoDB

Connect to your MongoDB and check:
```javascript
db.meetings.findOne({ _id: ObjectId("YOUR_MEETING_ID") })
```

Should show:
```json
{
  "_id": "...",
  "approvalStatus": "ok",
  "approvalReason": "...",
  "approvedBy": "USER_ID"
}
```

## Troubleshooting

### Issue: approvedBy is null or undefined

**Check:**
1. Did you restart the server after schema changes?
2. Is the user ID being sent from frontend? (Check browser console)
3. Check server logs for the update data
4. Verify MongoDB document has the field

**Solution:**
```bash
# Restart the server
npm run dev
# or
node server/index.js
```

### Issue: approvedByName shows "-" or user ID instead of name

**Check:**
1. Is the external users API responding? (Check server logs)
2. Is the user ID valid and exists in the external API?
3. Check the userMap in server logs

**Debug:**
Add this to analytics.ts temporarily:
```typescript
console.log('User Map:', Array.from(userMap.entries()));
console.log('Looking for user ID:', meeting.approvedBy);
console.log('Found name:', userMap.get(meeting.approvedBy));
```

### Issue: Field not showing in table

**Check:**
1. Is the column header present? (Should be "Approved By")
2. Check browser console for the meeting record structure
3. Verify the field name matches: `approvedByName` (not `approvedBy`)

## PowerShell Test Script

Run the included test script:
```powershell
.\test-approved-by.ps1
```

This will:
1. Update a meeting approval with approvedBy
2. Verify the field is stored
3. Check employee details API includes the field
4. Verify name mapping works

## Expected Results

✅ Backend stores `approvedBy` user ID
✅ Backend maps user ID to name using external API
✅ GET APIs return both `approvedBy` and `approvedByName`
✅ Frontend displays approver's name in "Approved By" column
✅ Data persists after page refresh

## API Endpoints Summary

| Endpoint | Method | Purpose | Returns approvedBy |
|----------|--------|---------|-------------------|
| `/api/meetings/:id/approval` | PUT | Update approval | ✅ Yes |
| `/api/meetings/approval-by-details` | PUT | Update by composite key | ✅ Yes |
| `/api/meetings/:id` | GET | Get single meeting | ✅ Yes |
| `/api/analytics/employee-details/:id` | GET | Get employee details | ✅ Yes (with name) |
| `/api/analytics/all-employees-details` | GET | Get all employees | ✅ Yes (with name) |

## Notes

- The `approvedBy` field stores the user ID (string)
- The `approvedByName` field is computed on-the-fly by mapping the ID to a name
- If the user is not found in external API, the ID is displayed instead
- The field is optional and defaults to `null` for unapproved meetings
