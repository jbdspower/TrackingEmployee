# Test Meeting-Based Location Tracking
# This script tests that start/out location times come from meetings, not tracking sessions

Write-Host "🧪 Testing Meeting-Based Location Tracking" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$employeeId = "YOUR_EMPLOYEE_ID_HERE"  # Replace with actual employee ID

Write-Host "📋 Test Steps:" -ForegroundColor Yellow
Write-Host "1. Create a test meeting (this will set Start Location Time)"
Write-Host "2. End the meeting (this will set Out Location Time)"
Write-Host "3. Fetch employee details to verify times come from meetings"
Write-Host ""

# Step 1: Create a meeting
Write-Host "Step 1: Creating test meeting..." -ForegroundColor Green
$meetingData = @{
    employeeId = $employeeId
    location = @{
        lat = 28.6139
        lng = 77.209
        address = "Test Location, New Delhi"
    }
    clientName = "Test Client"
    notes = "Test meeting for location tracking"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings" `
        -Method POST `
        -Body $meetingData `
        -ContentType "application/json"
    
    $meetingId = $createResponse.id
    Write-Host "✅ Meeting created: $meetingId" -ForegroundColor Green
    Write-Host "   Start Time: $($createResponse.startTime)" -ForegroundColor Gray
    Write-Host "   Location: $($createResponse.location.address)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to create meeting: $_" -ForegroundColor Red
    exit 1
}

# Wait a bit
Write-Host "⏳ Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Step 2: End the meeting
Write-Host "Step 2: Ending meeting..." -ForegroundColor Green
$endData = @{
    status = "completed"
    endTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    endLocation = @{
        lat = 28.6150
        lng = 77.210
        address = "Test End Location, New Delhi"
    }
    meetingDetails = @{
        discussion = "Test discussion"
        customers = @(
            @{
                customerEmployeeName = "Test Customer"
                customerEmployeeDesignation = "Manager"
            }
        )
    }
} | ConvertTo-Json -Depth 10

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" `
        -Method PUT `
        -Body $endData `
        -ContentType "application/json"
    
    Write-Host "✅ Meeting ended successfully" -ForegroundColor Green
    Write-Host "   End Time: $($updateResponse.endTime)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to end meeting: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Fetch employee details
Write-Host "Step 3: Fetching employee details..." -ForegroundColor Green
$today = Get-Date -Format "yyyy-MM-dd"

try {
    $detailsResponse = Invoke-RestMethod -Uri "$baseUrl/api/analytics/employee-details/${employeeId}?dateRange=today" `
        -Method GET
    
    Write-Host "✅ Employee details fetched" -ForegroundColor Green
    Write-Host ""
    
    # Find today's record
    $todayRecord = $detailsResponse.dayRecords | Where-Object { $_.date -eq $today }
    
    if ($todayRecord) {
        Write-Host "📊 Today's Record:" -ForegroundColor Cyan
        Write-Host "   Date: $($todayRecord.date)" -ForegroundColor White
        Write-Host "   Total Meetings: $($todayRecord.totalMeetings)" -ForegroundColor White
        Write-Host ""
        Write-Host "   ✅ Start Location Time: $($todayRecord.startLocationTime)" -ForegroundColor Green
        Write-Host "      (Should match first meeting start time)" -ForegroundColor Gray
        Write-Host "   📍 Start Location: $($todayRecord.startLocationAddress)" -ForegroundColor White
        Write-Host ""
        Write-Host "   ✅ Out Location Time: $($todayRecord.outLocationTime)" -ForegroundColor Green
        Write-Host "      (Should match last meeting end time)" -ForegroundColor Gray
        Write-Host "   📍 Out Location: $($todayRecord.outLocationAddress)" -ForegroundColor White
        Write-Host ""
        
        # Verify the times match
        $startMatches = $todayRecord.startLocationTime -eq $createResponse.startTime
        $endMatches = $todayRecord.outLocationTime -eq $updateResponse.endTime
        
        if ($startMatches -and $endMatches) {
            Write-Host "✅ SUCCESS: Times match meeting start/end times!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  WARNING: Times don't match exactly" -ForegroundColor Yellow
            if (-not $startMatches) {
                Write-Host "   Start time mismatch:" -ForegroundColor Yellow
                Write-Host "   Expected: $($createResponse.startTime)" -ForegroundColor Gray
                Write-Host "   Got: $($todayRecord.startLocationTime)" -ForegroundColor Gray
            }
            if (-not $endMatches) {
                Write-Host "   End time mismatch:" -ForegroundColor Yellow
                Write-Host "   Expected: $($updateResponse.endTime)" -ForegroundColor Gray
                Write-Host "   Got: $($todayRecord.outLocationTime)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "⚠️  No record found for today" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Failed to fetch employee details: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Test completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Manual Verification Steps:" -ForegroundColor Yellow
Write-Host "1. Open the Dashboard in your browser"
Write-Host "2. Navigate to Analytics Dashboard"
Write-Host "3. Click 'View Details' for the test employee"
Write-Host "4. Verify the Start Location Time and Out Location Time are displayed"
Write-Host "5. Verify they match the meeting start and end times"
Write-Host ""
