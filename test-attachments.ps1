# Test script to verify attachments are stored and retrieved

Write-Host "Testing Meeting Attachments Feature" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test 1: Check if a meeting has attachments
Write-Host "Test 1: Checking meeting for attachments" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

try {
    # Replace with your actual meeting ID
    $meetingId = "694517e3ccf1443e3e12e35a"
    
    Write-Host "Fetching meeting: $meetingId" -ForegroundColor White
    $meeting = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" -Method Get
    
    Write-Host "Meeting retrieved:" -ForegroundColor White
    Write-Host "  ID: $($meeting.id)" -ForegroundColor White
    Write-Host "  Client: $($meeting.clientName)" -ForegroundColor White
    Write-Host "  Status: $($meeting.status)" -ForegroundColor White
    
    if ($meeting.meetingDetails) {
        Write-Host "  Meeting Details:" -ForegroundColor White
        Write-Host "    Discussion: $($meeting.meetingDetails.discussion)" -ForegroundColor White
        
        if ($meeting.meetingDetails.attachments) {
            Write-Host "    ✅ Attachments: $($meeting.meetingDetails.attachments.Count) file(s)" -ForegroundColor Green
            
            for ($i = 0; $i -lt $meeting.meetingDetails.attachments.Count; $i++) {
                $attachment = $meeting.meetingDetails.attachments[$i]
                $size = $attachment.Length
                $type = if ($attachment -match 'data:([^;]+);') { $matches[1] } else { 'unknown' }
                Write-Host "      File $($i + 1): $type, $([math]::Round($size / 1024, 2)) KB" -ForegroundColor White
            }
        } else {
            Write-Host "    ❌ No attachments found" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ No meeting details" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error fetching meeting:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Check employee details API" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

try {
    $employeeId = "67daa55d9c4abb36045d5bfe"
    
    Write-Host "Fetching employee details: $employeeId" -ForegroundColor White
    $details = Invoke-RestMethod -Uri "$baseUrl/api/analytics/employee-details/$employeeId?dateRange=today" -Method Get
    
    if ($details.meetingRecords -and $details.meetingRecords.Count -gt 0) {
        Write-Host "Found $($details.meetingRecords.Count) meeting(s)" -ForegroundColor White
        
        $meetingsWithAttachments = 0
        foreach ($meeting in $details.meetingRecords) {
            if ($meeting.attachments -and $meeting.attachments.Count -gt 0) {
                $meetingsWithAttachments++
                Write-Host "  Meeting: $($meeting.companyName)" -ForegroundColor White
                Write-Host "    ✅ Attachments: $($meeting.attachments.Count) file(s)" -ForegroundColor Green
            }
        }
        
        if ($meetingsWithAttachments -eq 0) {
            Write-Host "  ⚠️ No meetings with attachments found" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ $meetingsWithAttachments meeting(s) with attachments" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️ No meeting records found" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error fetching employee details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 3: Check MongoDB directly" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Yellow
Write-Host "Run this in MongoDB shell:" -ForegroundColor White
Write-Host "  db.meetings.findOne({ _id: ObjectId('694517e3ccf1443e3e12e35a') })" -ForegroundColor Gray
Write-Host ""
Write-Host "Look for:" -ForegroundColor White
Write-Host "  meetingDetails.attachments: [...]" -ForegroundColor Gray
Write-Host ""

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "If attachments are not showing:" -ForegroundColor Yellow
Write-Host "1. ⚠️ RESTART THE SERVER (schema changes require restart)" -ForegroundColor Red
Write-Host "2. Check server console for attachment logs" -ForegroundColor White
Write-Host "3. Try ending a new meeting with attachments" -ForegroundColor White
Write-Host "4. Check MongoDB directly" -ForegroundColor White
