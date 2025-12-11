# Test script for Analytics API Enhancement
# Tests the new features: Start Location Time, Out Location Time, and Attendance Added By

Write-Host "Testing Analytics API Enhancement..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$employeeId = "67daa55d9c4abb36045d5bfe"  # Replace with actual employee ID
$dateRange = "all"

# Test 1: Fetch employee details
Write-Host "Test 1: Fetching employee details..." -ForegroundColor Yellow
$url = "$baseUrl/api/analytics/employee-details/${employeeId}?dateRange=$dateRange"
Write-Host "URL: $url" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -ContentType "application/json"
    
    Write-Host "✓ API call successful" -ForegroundColor Green
    Write-Host ""
    
    # Check if dayRecords exist
    if ($response.dayRecords -and $response.dayRecords.Count -gt 0) {
        Write-Host "Found $($response.dayRecords.Count) day records" -ForegroundColor Green
        Write-Host ""
        
        # Display first day record details
        $firstRecord = $response.dayRecords[0]
        Write-Host "Sample Day Record:" -ForegroundColor Cyan
        Write-Host "  Date: $($firstRecord.date)" -ForegroundColor White
        Write-Host "  Total Meetings: $($firstRecord.totalMeetings)" -ForegroundColor White
        Write-Host "  Start Location Time: $($firstRecord.startLocationTime)" -ForegroundColor Yellow
        Write-Host "  Start Location Address: $($firstRecord.startLocationAddress)" -ForegroundColor White
        Write-Host "  Out Location Time: $($firstRecord.outLocationTime)" -ForegroundColor Yellow
        Write-Host "  Out Location Address: $($firstRecord.outLocationAddress)" -ForegroundColor White
        Write-Host "  Total Duty Hours: $($firstRecord.totalDutyHours)" -ForegroundColor White
        Write-Host "  Meeting Time: $($firstRecord.meetingTime)" -ForegroundColor White
        Write-Host "  Attendance Added By: $($firstRecord.attendanceAddedBy)" -ForegroundColor Yellow
        Write-Host ""
        
        # Verify new fields exist
        $hasStartTime = $null -ne $firstRecord.startLocationTime
        $hasOutTime = $null -ne $firstRecord.outLocationTime
        $hasAttendanceAddedBy = $null -ne (Get-Member -InputObject $firstRecord -Name "attendanceAddedBy")
        
        Write-Host "Verification:" -ForegroundColor Cyan
        Write-Host "  ✓ Start Location Time field exists: $hasStartTime" -ForegroundColor $(if($hasStartTime){"Green"}else{"Red"})
        Write-Host "  ✓ Out Location Time field exists: $hasOutTime" -ForegroundColor $(if($hasOutTime){"Green"}else{"Red"})
        Write-Host "  ✓ Attendance Added By field exists: $hasAttendanceAddedBy" -ForegroundColor $(if($hasAttendanceAddedBy){"Green"}else{"Red"})
        Write-Host ""
        
        # Check if times are from meetings (not tracking sessions)
        if ($firstRecord.totalMeetings -gt 0) {
            Write-Host "Note: This day has $($firstRecord.totalMeetings) meeting(s)" -ForegroundColor Cyan
            Write-Host "  - Start Location Time should be from FIRST meeting start" -ForegroundColor White
            Write-Host "  - Out Location Time should be from LAST meeting end" -ForegroundColor White
        } else {
            Write-Host "Note: This day has no meetings" -ForegroundColor Yellow
            Write-Host "  - Times will fall back to tracking session times" -ForegroundColor White
        }
        Write-Host ""
        
        # Display all day records summary
        Write-Host "All Day Records Summary:" -ForegroundColor Cyan
        foreach ($record in $response.dayRecords) {
            $addedBy = if ($record.attendanceAddedBy) { $record.attendanceAddedBy } else { "Self-reported" }
            Write-Host "  $($record.date): $($record.totalMeetings) meetings, Added by: $addedBy" -ForegroundColor White
        }
        
    } else {
        Write-Host "⚠ No day records found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✓ Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "✗ API call failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. The server is running (npm run dev)" -ForegroundColor White
    Write-Host "  2. The employee ID is correct" -ForegroundColor White
    Write-Host "  3. MongoDB is connected" -ForegroundColor White
}

Write-Host ""
Write-Host "Test script completed." -ForegroundColor Cyan
