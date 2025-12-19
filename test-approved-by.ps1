# Test script to verify approvedBy field is stored and retrieved correctly

Write-Host "Testing Approved By Feature" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test 1: Update meeting approval with approvedBy
Write-Host "Test 1: Updating meeting approval with approvedBy field" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow

try {
    # Replace with an actual meeting ID from your database
    $meetingId = "6944ce91fa00be8bd69bcef4"
    $userId = "67daa55d9c4abb36045d5bfe"
    
    $approvalData = @{
        approvalStatus = "ok"
        approvalReason = "Testing approved by feature"
        approvedBy = $userId
    } | ConvertTo-Json
    
    Write-Host "Sending approval data:" -ForegroundColor White
    Write-Host $approvalData -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId/approval" -Method Put -Body $approvalData -ContentType "application/json"
    
    Write-Host "✅ Meeting approval updated successfully!" -ForegroundColor Green
    Write-Host "   Status: $($response.approvalStatus)" -ForegroundColor White
    Write-Host "   Reason: $($response.approvalReason)" -ForegroundColor White
    Write-Host "   Approved By ID: $($response.approvedBy)" -ForegroundColor White
    Write-Host ""
    
    # Verify the field was stored
    if ($response.approvedBy) {
        Write-Host "✅ approvedBy field is present in response!" -ForegroundColor Green
    } else {
        Write-Host "❌ approvedBy field is MISSING in response!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error updating meeting approval:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Verify meeting data includes approvedBy" -ForegroundColor Yellow
Write-Host "------------------------------------------------" -ForegroundColor Yellow

try {
    $meetingId = "6944ce91fa00be8bd69bcef4"
    $meeting = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" -Method Get
    
    Write-Host "Meeting data retrieved:" -ForegroundColor White
    Write-Host "   ID: $($meeting.id)" -ForegroundColor White
    Write-Host "   Approval Status: $($meeting.approvalStatus)" -ForegroundColor White
    Write-Host "   Approval Reason: $($meeting.approvalReason)" -ForegroundColor White
    Write-Host "   Approved By: $($meeting.approvedBy)" -ForegroundColor White
    Write-Host ""
    
    if ($meeting.approvedBy) {
        Write-Host "✅ approvedBy field is stored in database!" -ForegroundColor Green
    } else {
        Write-Host "❌ approvedBy field is NOT stored in database!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error retrieving meeting:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 3: Check employee details API includes approvedByName" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------" -ForegroundColor Yellow

try {
    $employeeId = "67daa55d9c4abb36045d5bfe"
    $details = Invoke-RestMethod -Uri "$baseUrl/api/analytics/employee/$employeeId/details?dateRange=today" -Method Get
    
    if ($details.meetingRecords -and $details.meetingRecords.Count -gt 0) {
        $firstMeeting = $details.meetingRecords[0]
        
        Write-Host "First meeting record:" -ForegroundColor White
        Write-Host "   Company: $($firstMeeting.companyName)" -ForegroundColor White
        Write-Host "   Approval Status: $($firstMeeting.approvalStatus)" -ForegroundColor White
        Write-Host "   Approved By ID: $($firstMeeting.approvedBy)" -ForegroundColor White
        Write-Host "   Approved By Name: $($firstMeeting.approvedByName)" -ForegroundColor White
        Write-Host ""
        
        if ($firstMeeting.approvedByName) {
            Write-Host "✅ approvedByName field is present and mapped!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  approvedByName field is not present (may not be approved yet)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  No meeting records found for today" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error retrieving employee details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
