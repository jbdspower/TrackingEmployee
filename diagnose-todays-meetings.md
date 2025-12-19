# Diagnosing Today's Meetings Issue

## Issue Description
When starting a meeting from Today's Meetings, the meeting details (time, location, etc.) are not showing in the dashboard.

## Recent Changes Made
The ONLY change made to the codebase was:
- **File**: `server/index.ts`
- **Change**: Increased body parser limit from 100KB to 20MB
- **Lines Changed**: 
  ```typescript
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));
  ```
- **Impact**: This change ONLY affects request size limits, not meeting functionality

## Why This Change Should NOT Affect Meetings

1. **Body parser limit** only controls maximum request size
2. **Does not change** how data is parsed or processed
3. **Does not affect** database operations
4. **Does not modify** any meeting-related logic
5. **Does not touch** any meeting routes or handlers

## Diagnostic Steps

### Step 1: Check if Meeting is Created

1. Start a meeting from Today's Meetings
2. Check server console for:
   ```
   ✅ Meeting saved to MongoDB: { id, employeeId, followUpId, status, clientName }
   ```

3. If you see this, the meeting IS being created

### Step 2: Check if Meeting is Retrieved

1. After starting meeting, check server console for:
   ```
   📥 Fetching meetings with query: { employeeId: "..." }
   ✅ Found X meetings matching query
   ```

2. If you see this, meetings ARE being retrieved

### Step 3: Check Dashboard API Call

1. Open browser DevTools → Network tab
2. Look for request to: `/api/analytics/employee-details/:employeeId`
3. Check response - does it include the meeting?

### Step 4: Check Meeting Data Structure

In browser console, check:
```javascript
// After meeting is started
console.log('Meeting records:', employeeMeetingRecords);
```

Look for:
- `meetingInTime` - Should have time
- `meetingInLocation` - Should have location
- `companyName` - Should have company name

## Common Issues (Not Related to Body Size Change)

### Issue 1: Meeting Not Saved to Database

**Symptoms:**
- No meeting appears in dashboard
- Server console shows no "Meeting saved" message

**Causes:**
- Database connection issue
- Validation error
- Missing required fields

**Solution:**
- Check server console for errors
- Verify MongoDB is running
- Check meeting data being sent

### Issue 2: Meeting Saved But Not Retrieved

**Symptoms:**
- Server shows "Meeting saved"
- Dashboard doesn't show meeting
- API response doesn't include meeting

**Causes:**
- Date range filter excluding meeting
- Employee ID mismatch
- Status filter issue

**Solution:**
- Check date range in dashboard
- Verify employee ID matches
- Check meeting status

### Issue 3: Meeting Retrieved But Not Displayed

**Symptoms:**
- API response includes meeting
- Dashboard doesn't show it
- No errors in console

**Causes:**
- Frontend filtering issue
- Data mapping problem
- UI rendering issue

**Solution:**
- Check browser console for errors
- Verify data structure matches interface
- Check if meeting is filtered out

## What to Check

### 1. Server Console Logs

When starting a meeting, you should see:
```
🚀 Attempting to start meeting from follow-up: [Company Name]
✅ No active meeting found, proceeding to start...
📤 Sending POST request to: /api/meetings
✅ Meeting saved to MongoDB: [Meeting ID]
```

### 2. Browser Console Logs

When viewing dashboard, you should see:
```
🔍 Fetching employee details from: /api/analytics/employee-details/[ID]
✅ Employee details received: { dayRecords: X, meetingRecords: Y }
📊 Setting state with X day records and Y meeting records
```

### 3. Network Tab

Check the API response:
```json
{
  "dayRecords": [...],
  "meetingRecords": [
    {
      "companyName": "...",
      "meetingInTime": "HH:mm",
      "meetingInLocation": "...",
      "date": "YYYY-MM-DD",
      ...
    }
  ]
}
```

## Verification Steps

### Test 1: Normal Meeting (Not Today's Meeting)

1. Go to Tracking page
2. Start a meeting manually (not from Today's Meetings)
3. Check if it appears in dashboard
4. If YES → Issue is specific to Today's Meetings
5. If NO → Issue is general meeting display

### Test 2: Today's Meeting

1. Go to Tracking page
2. Start a meeting from Today's Meetings section
3. Check server console for meeting creation logs
4. Check dashboard for meeting display
5. Compare with normal meeting behavior

### Test 3: API Direct Check

```bash
# Check if meeting exists in database
curl http://localhost:3000/api/meetings?employeeId=YOUR_EMPLOYEE_ID

# Check employee details API
curl http://localhost:3000/api/analytics/employee-details/YOUR_EMPLOYEE_ID?dateRange=today
```

## Rollback Instructions (If Needed)

If you believe the body size change is causing issues (though it shouldn't):

1. Open `server/index.ts`
2. Change:
   ```typescript
   // From:
   app.use(express.json({ limit: '20mb' }));
   app.use(express.urlencoded({ extended: true, limit: '20mb' }));
   
   // To:
   app.use(express.json());
   app.use(express.urlencoded({ extended: true }));
   ```
3. Restart server
4. Test again

**Note:** This will break file attachments (request too large error)

## Most Likely Causes

Based on the symptoms, the issue is likely:

1. **Server not restarted** after recent changes
2. **Date range filter** excluding today's meetings
3. **Meeting status** not matching expected values
4. **Frontend state** not updating after meeting creation
5. **Cache issue** in browser

## Recommended Actions

1. **Restart the server** (most important!)
   ```bash
   Ctrl+C
   npm run dev
   ```

2. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R
   - Or clear cache in DevTools

3. **Check server console** for errors

4. **Check browser console** for errors

5. **Verify meeting is created** in MongoDB:
   ```javascript
   db.meetings.find({ employeeId: "YOUR_ID" }).sort({ startTime: -1 }).limit(5)
   ```

## Need More Information

To help diagnose, please provide:

1. **Server console output** when starting meeting
2. **Browser console output** when viewing dashboard
3. **Network tab** showing API requests/responses
4. **Meeting data** from MongoDB (if accessible)
5. **Specific error messages** if any

## Summary

The body size limit change (100KB → 20MB) should NOT affect meeting functionality. It only allows larger request payloads for file attachments.

If meetings are not showing:
1. Restart server
2. Clear browser cache
3. Check console logs
4. Verify meeting is created in database
5. Check API responses

The issue is likely unrelated to the body size change and may be:
- Server not restarted
- Cache issue
- Date/time filtering
- Existing bug unrelated to recent changes
