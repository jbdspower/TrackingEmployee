# Debug Guide: "No Active Meeting Found" Issue

## Problem

User starts a meeting, closes browser, reopens, and gets error:
```
"No Active Meeting found. The meeting may not have been saved properly when started."
```

External API shows:
```json
{
  "_id": "693110908e123a34d334b21d",
  "meetingStatus": "meeting on-going",
  "userId": "68259de4b11c5d5477a0c778"
}
```

But local database query returns 404.

## Enhanced Debugging

I've added comprehensive logging to help diagnose the issue.

### Step 1: Start a Meeting

When you start a meeting, check the **server logs** for:

```
✅ Meeting saved to MongoDB: {
  id: "...",
  employeeId: "68259de4b11c5d5477a0c778",
  followUpId: "693110908e123a34d334b21d",
  status: "in-progress",
  clientName: "testing"
}

✅ VERIFIED: Meeting exists in database
✅ VERIFIED followUpId: 693110908e123a34d334b21d
✅ VERIFIED status: in-progress
✅ VERIFIED: Can find meeting by followUpId
```

**If you see these**, the meeting was saved correctly! ✅

**If you see errors**, there's a database save issue ❌

### Step 2: Try to End Meeting

When you click "End Meeting", check the **browser console** for:

```
🔴 handleEndMeetingFromFollowUp called with: {
  followUpId: "693110908e123a34d334b21d",
  meetingId: ""
}

🔍 Step 1: Checking local database...
🔍 Querying local database by followUpId: 693110908e123a34d334b21d
```

Then check **server logs** for:

```
📥 Query: {
  "status": {"$in": ["in-progress", "started"]},
  "followUpId": "693110908e123a34d334b21d"
}

✅ Active meeting found: {
  id: "...",
  followUpId: "693110908e123a34d334b21d",
  status: "in-progress",
  client: "testing"
}
```

**If you see this**, the meeting was found! ✅

**If you see 404**, check the debug info:

```
⚠️ No active meeting found with query: {...}

📋 All meetings for employee: [
  {
    id: "...",
    status: "completed",  ← Wrong status!
    followUpId: "693110908e123a34d334b21d",
    startTime: "..."
  }
]

📋 All active meetings in database: []  ← No active meetings!
```

## Common Issues

### Issue 1: Meeting Status is Wrong

**Symptom:**
```
status: "completed"  // Should be "in-progress"
```

**Cause**: Meeting was ended or status was changed

**Solution**: Check if meeting was accidentally ended

### Issue 2: followUpId is Missing

**Symptom:**
```
followUpId: null  // Should have a value
```

**Cause**: Meeting was created without followUpId

**Solution**: Check `startMeetingFromFollowUp` function

### Issue 3: Meeting Not in Database

**Symptom:**
```
📋 All meetings for employee: []  // Empty!
```

**Cause**: Database save failed or meeting was deleted

**Solution**: Check database connection and save errors

### Issue 4: Wrong employeeId

**Symptom:**
```
employeeId: "68259de4b11c5d5477a0c778"  // Different from logged-in user
```

**Cause**: Using wrong user ID

**Solution**: Verify logged-in user ID matches

## Manual Database Check

### Connect to MongoDB

```bash
mongo
use your_database_name
```

### Check for Active Meetings

```javascript
db.meetings.find({ 
  status: { $in: ["in-progress", "started"] } 
}).pretty()
```

**Expected:**
```json
{
  "_id": ObjectId("..."),
  "employeeId": "68259de4b11c5d5477a0c778",
  "followUpId": "693110908e123a34d334b21d",
  "status": "in-progress",
  "clientName": "testing",
  "startTime": "2025-12-04T04:42:19.719Z",
  ...
}
```

### Check Specific Meeting by followUpId

```javascript
db.meetings.find({ 
  followUpId: "693110908e123a34d334b21d" 
}).pretty()
```

### Check All Meetings for Employee

```javascript
db.meetings.find({ 
  employeeId: "68259de4b11c5d5477a0c778" 
}).sort({ startTime: -1 }).limit(10).pretty()
```

## Test API Endpoints

### Test Local Database Endpoint

```bash
# By followUpId
curl "http://localhost:5000/api/meetings/active?followUpId=693110908e123a34d334b21d"

# By employeeId
curl "http://localhost:5000/api/meetings/active?employeeId=68259de4b11c5d5477a0c778"
```

**Expected (Success):**
```json
{
  "id": "...",
  "employeeId": "68259de4b11c5d5477a0c778",
  "followUpId": "693110908e123a34d334b21d",
  "status": "in-progress",
  "clientName": "testing",
  ...
}
```

**Expected (Not Found):**
```json
{
  "error": "No active meeting found",
  "employeeId": "68259de4b11c5d5477a0c778",
  "followUpId": "693110908e123a34d334b21d",
  "debug": {
    "totalMeetingsForEmployee": 5,
    "totalActiveMeetings": 0
  }
}
```

### Test External API

```bash
curl "https://jbdspower.in/LeafNetServer/api/getFollowUpHistory?userId=68259de4b11c5d5477a0c778"
```

Look for:
```json
{
  "_id": "693110908e123a34d334b21d",
  "meetingStatus": "meeting on-going",
  ...
}
```

## Debugging Steps

### Step 1: Verify Meeting is Saved

1. Start a meeting
2. Check server logs for "✅ VERIFIED: Meeting exists in database"
3. If not verified, check database connection

### Step 2: Verify followUpId is Stored

1. Check server logs for "✅ VERIFIED followUpId: ..."
2. If null, check `startMeetingFromFollowUp` function

### Step 3: Verify Status is Correct

1. Check server logs for "✅ VERIFIED status: in-progress"
2. If "completed", meeting was ended

### Step 4: Verify Query Works

1. Check server logs for "✅ VERIFIED: Can find meeting by followUpId"
2. If not found, check database indexes

### Step 5: Manual Database Check

1. Connect to MongoDB
2. Run query: `db.meetings.find({ followUpId: "..." })`
3. Verify meeting exists

## Solutions

### Solution 1: Database Connection Issue

**If meetings aren't being saved:**

1. Check MongoDB is running:
   ```bash
   systemctl status mongod
   ```

2. Check connection string in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/your_database
   ```

3. Restart server:
   ```bash
   pm2 restart tracking-app
   ```

### Solution 2: followUpId Not Being Saved

**If followUpId is null:**

1. Check `startMeetingFromFollowUp` function
2. Verify `followUpId` parameter is passed
3. Check server logs for "followUpId: ..."

### Solution 3: Status Changed to "completed"

**If meeting status is wrong:**

1. Check if meeting was accidentally ended
2. Check for auto-end logic
3. Verify external API isn't changing status

### Solution 4: Database Index Missing

**If query is slow or not working:**

1. Create index on followUpId:
   ```javascript
   db.meetings.createIndex({ followUpId: 1 })
   ```

2. Create compound index:
   ```javascript
   db.meetings.createIndex({ 
     followUpId: 1, 
     status: 1 
   })
   ```

## Deployment with Enhanced Logging

```bash
cd TrackingEmployee
npm run build
pm2 restart tracking-app
pm2 logs tracking-app --lines 100
```

## What to Look For

### Success Pattern

```
[Server] ✅ Meeting saved to MongoDB
[Server] ✅ VERIFIED: Meeting exists in database
[Server] ✅ VERIFIED followUpId: 693110908e123a34d334b21d
[Server] ✅ VERIFIED: Can find meeting by followUpId
[Browser] ✅ Found active meeting in LOCAL DATABASE
[Browser] 🎉 Opening End Meeting modal
```

### Failure Pattern

```
[Server] ✅ Meeting saved to MongoDB
[Server] ❌ VERIFICATION FAILED: Cannot find meeting by followUpId!
[Browser] ⚠️ Not found in local database
[Browser] ❌ No active meeting found
```

## Next Steps

1. **Deploy** with enhanced logging
2. **Start a meeting** and check logs
3. **Close browser** and reopen
4. **Try to end meeting** and check logs
5. **Report findings** with log output

The enhanced logging will help us identify exactly where the issue is occurring!
