# Quick Start: Incomplete Meetings Feature

## What This Does
When you have pending meetings and try to logout, you'll be asked to provide a **separate reason for each company/meeting** before logging out.

## How to Use

### As a User
1. **Have pending meetings** scheduled for today
2. **Click Logout** button
3. **See the modal** showing all your pending meetings
4. **Fill in a reason** for each meeting (required)
5. **Click "Submit All & Logout"**
6. You're logged out, and all reasons are saved

### Example
```
Pending Meeting 1: Tech Solutions Inc - John Doe
Reason: "Client requested to reschedule to next Monday"

Pending Meeting 2: Global Corp - Jane Smith  
Reason: "Waiting for budget approval from management"

Pending Meeting 3: Innovation Labs - Bob Johnson
Reason: "Technical issues with video call platform"
```

## API Usage

### Save Incomplete Meetings
```javascript
POST /api/incomplete-meeting-remarks

{
  "employeeId": "user_id",
  "pendingMeetings": [
    {
      "_id": "meeting_id",
      "leadId": "JBDSL-0001",
      "companyName": "Tech Solutions Inc",
      "customerName": "John Doe",
      "incompleteReason": "Client requested reschedule"
    }
  ]
}
```

### Get Incomplete Meetings
```javascript
GET /api/incomplete-meeting-remarks?employeeId=user_id

Response:
{
  "meetings": [
    {
      "leadInfo": { "companyName": "Tech Solutions Inc" },
      "meetingDetails": {
        "incomplete": true,
        "incompleteReason": "Client requested reschedule"
      }
    }
  ]
}
```

### View in Meeting History
```javascript
GET /api/meeting-history?employeeId=user_id

// Filter where meetingDetails.incomplete === true
```

## Testing

### Quick Test
```powershell
# Run the test script
.\test-incomplete-meetings.ps1
```

### Manual Test
1. Start server: `npm run dev`
2. Login with a user account
3. Ensure you have pending meetings for today
4. Click logout
5. Fill in reasons for each meeting
6. Submit and verify in meeting history

## Key Features

✅ **Individual Reasons** - Each meeting gets its own reason  
✅ **Validation** - Can't submit without filling all reasons  
✅ **Company Context** - Shows company name, customer, time  
✅ **Scrollable** - Handles many meetings gracefully  
✅ **Persistent** - Saved to database with meeting history  
✅ **Retrievable** - Can query incomplete meetings via API  

## Data Stored

For each incomplete meeting:
- ✓ Company name
- ✓ Customer details
- ✓ Lead ID
- ✓ Individual reason
- ✓ Timestamp
- ✓ Employee ID
- ✓ `incomplete: true` flag

## Where to Find Incomplete Meetings

1. **Meeting History API**: Filter by `incomplete: true`
2. **Analytics Dashboard**: Shows in employee details
3. **Database**: `meetingHistory` collection with `incomplete` flag

## Troubleshooting

**Modal doesn't appear?**
- Check if you have pending meetings for today
- Verify user is logged in
- Check browser console for errors

**Reasons not saving?**
- Check server is running
- Verify API endpoint is accessible
- Check network tab for API response

**Can't submit?**
- Ensure all meetings have reasons filled in
- Check for validation error messages
- Verify no empty text areas

## Files Involved

- `client/components/PendingMeetingsModal.tsx` - The modal UI
- `client/pages/Index.tsx` - Logout handler
- `server/routes/tracking.ts` - API endpoints

## Support

For issues or questions, check:
1. `INCOMPLETE_MEETINGS_FEATURE.md` - Full documentation
2. `IMPLEMENTATION_SUMMARY_INCOMPLETE_MEETINGS.md` - Implementation details
3. Server logs for API errors
