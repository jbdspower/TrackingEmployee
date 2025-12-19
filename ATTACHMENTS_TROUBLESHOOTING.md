# Attachments Not Showing - Troubleshooting Guide

## Problem
Attachments are being sent in the request but not appearing in the database or API responses.

## Root Cause
MongoDB schema changes require a server restart to take effect. The `attachments` field was added to the schema, but the running server instance is still using the old schema definition.

## Solution

### Step 1: Restart the Server (CRITICAL)

**This is the most important step!**

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
# or
node server/index.js
```

**Why?** 
- Mongoose caches schema definitions when the server starts
- Schema changes (like adding `attachments` field) are not recognized until restart
- Without restart, MongoDB will ignore the new field

### Step 2: Verify Schema is Loaded

Check server console on startup for:
```
✅ MongoDB connected successfully
✅ Models loaded: Meeting, Attendance, TrackingSession
```

### Step 3: Test with New Meeting

1. **Start a new meeting** (don't use old meetings)
2. **End the meeting** with file attachments
3. **Check server console** for:
   ```
   📎 Attachments received: 1 files
      File 1: image/png, 245.67 KB
   ✅ Attachments stored: 1 files
   ✅ Attachments in response: 1 files
   ```

### Step 4: Verify in Database

Connect to MongoDB and check:
```javascript
db.meetings.findOne({ _id: ObjectId("YOUR_MEETING_ID") })
```

Should show:
```json
{
  "meetingDetails": {
    "customers": [...],
    "discussion": "...",
    "attachments": [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    ]
  }
}
```

### Step 5: Check API Response

```bash
curl http://localhost:3000/api/meetings/YOUR_MEETING_ID
```

Should include:
```json
{
  "meetingDetails": {
    "attachments": [...]
  }
}
```

## Common Issues

### Issue 1: Server Not Restarted

**Symptoms:**
- Attachments in request payload
- No attachments in database
- No error messages

**Solution:**
```bash
# Kill all node processes
taskkill /F /IM node.exe
# Or on Mac/Linux:
killall node

# Restart server
npm run dev
```

### Issue 2: Old Meeting Data

**Symptoms:**
- New meetings work
- Old meetings don't have attachments

**Explanation:**
- Old meetings were created before schema update
- They don't have the `attachments` field
- This is expected behavior

**Solution:**
- Only new meetings (created after restart) will have attachments
- Old meetings cannot be updated to add attachments retroactively

### Issue 3: Schema Not Updated

**Symptoms:**
- Server restarted but still no attachments
- MongoDB errors about unknown field

**Solution:**
1. Check `server/models/Meeting.ts`:
   ```typescript
   const MeetingDetailsSchema = new Schema({
     customers: [CustomerContactSchema],
     discussion: { type: String, required: true },
     attachments: { type: [String], default: [] }, // ← This line must exist
     // ...
   });
   ```

2. If missing, add it and restart server

### Issue 4: File Too Large

**Symptoms:**
- Request hangs or fails
- No error message
- Browser becomes unresponsive

**Cause:**
- File is too large for base64 encoding
- MongoDB document size limit (16MB)

**Solution:**
1. Check file size before upload:
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
   if (file.size > MAX_FILE_SIZE) {
     alert('File too large');
     return;
   }
   ```

2. Compress images before upload
3. Use cloud storage for large files

### Issue 5: Base64 Conversion Failed

**Symptoms:**
- Error in browser console
- "Failed to end meeting"
- No attachments sent

**Solution:**
1. Check browser console for errors
2. Verify FileReader API is supported
3. Try with different file types

## Debug Checklist

### Frontend (Browser Console)

Look for these logs:
```
📎 Converting files to base64...
✅ Converted X files to base64
EndMeetingModal: Calling onEndMeeting with attachments: X files
```

If missing:
- Files not being converted
- Check EndMeetingModal.tsx
- Verify FileReader code

### Backend (Server Console)

Look for these logs:
```
📝 Updating meeting XXX with status: completed
📎 Attachments received: X files
   File 1: image/png, 245.67 KB
✅ Attachments stored: X files
✅ Attachments in response: X files
```

If missing:
- Attachments not in request
- Check frontend is sending them
- Check network tab in browser

### Network Tab

1. Open browser DevTools → Network
2. Find the PUT request to `/api/meetings/:id`
3. Check Request Payload:
   ```json
   {
     "meetingDetails": {
       "attachments": [
         "data:image/png;base64,..."
       ]
     }
   }
   ```

4. Check Response:
   ```json
   {
     "meetingDetails": {
       "attachments": [...]
     }
   }
   ```

## Testing Script

Run the included test script:
```powershell
.\test-attachments.ps1
```

This will:
1. Check if a specific meeting has attachments
2. Verify employee details API returns attachments
3. Provide MongoDB query to check directly

## MongoDB Direct Check

```javascript
// Connect to MongoDB
mongo

// Switch to your database
use your_database_name

// Find meeting with attachments
db.meetings.findOne(
  { "meetingDetails.attachments": { $exists: true, $ne: [] } }
)

// Count meetings with attachments
db.meetings.countDocuments({
  "meetingDetails.attachments": { $exists: true, $ne: [] }
})

// Check specific meeting
db.meetings.findOne({ _id: ObjectId("YOUR_MEETING_ID") })
```

## Still Not Working?

### 1. Clear Everything and Start Fresh

```bash
# Stop server
Ctrl+C

# Clear node_modules (optional but thorough)
rm -rf node_modules
npm install

# Restart server
npm run dev
```

### 2. Check File Permissions

Ensure the server can write to MongoDB:
- Check MongoDB connection string
- Verify user has write permissions
- Check MongoDB logs for errors

### 3. Check MongoDB Version

Attachments feature requires:
- MongoDB 3.6+ (for array fields)
- Mongoose 5.0+ (for schema updates)

### 4. Enable Debug Logging

Add to server startup:
```typescript
mongoose.set('debug', true);
```

This will log all MongoDB operations.

### 5. Test with Simple Data

Try with a very small file (< 1KB):
1. Create a tiny text file
2. Attach it to meeting
3. Check if it's stored

If small files work but large files don't:
- File size is the issue
- Implement size validation

## Expected Behavior

### ✅ Working Correctly

1. **Frontend:**
   - User selects files
   - Files shown in list
   - Submit button works
   - No errors in console

2. **Backend:**
   - Receives attachments in request
   - Logs show file count and sizes
   - Stores in MongoDB
   - Returns in response

3. **Database:**
   - `meetingDetails.attachments` array exists
   - Contains base64 data URLs
   - Data is complete (not truncated)

4. **Dashboard:**
   - Attachments column shows files
   - Links are clickable
   - Files download/open correctly

### ❌ Not Working

1. **Frontend:**
   - Files selected but not sent
   - Error during conversion
   - Submit fails silently

2. **Backend:**
   - No attachment logs
   - Attachments not in database
   - Response missing attachments

3. **Database:**
   - `meetingDetails.attachments` missing
   - Empty array
   - Field doesn't exist

4. **Dashboard:**
   - Shows "-" in attachments column
   - No links visible
   - Empty state

## Quick Fix Summary

**90% of issues are solved by:**

1. **Restart the server** ← Most important!
2. **Test with new meeting** (not old ones)
3. **Check server console** for logs
4. **Verify in MongoDB** directly

**If still not working:**

1. Check schema in `Meeting.ts`
2. Check EndMeetingModal sends attachments
3. Check network request includes attachments
4. Check MongoDB connection and permissions

## Contact/Support

If none of these solutions work:
1. Check server logs for errors
2. Check MongoDB logs
3. Verify all files were updated correctly
4. Try with a fresh database (test environment)
