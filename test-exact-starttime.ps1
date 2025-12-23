# Test Exact Start Time Preservation
# This script tests that the exact start time when user clicks "Start Meeting" is preserved

$baseUrl = "http://localhost:5001"
$employeeId = "686616b28bbe842c04a815f0"

Write-Host "Testing Exact Start Time Preservation..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "Employee ID: $employeeId" -ForegroundColor Gray

# Step 1: Simulate user clicking "Start Meeting" at a specific time
Write-Host ""
Write-Host "Step 1: Simulating user clicking Start Meeting..." -ForegroundColor Yellow

# Capture the exact moment user would click "Start Meeting"
$userClickTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
Write-Host "User clicked Start Meeting at: $userClickTime" -ForegroundColor Green

# Wait a moment to simulate processing delay
Write-Host "Simulating processing delay..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 500

# Step 2: Create meeting with the exact user click time
Write-Host ""
Write-Host "Step 2: Creating meeting with exact user click time..." -ForegroundColor Yellow

$meetingData = @{
    employeeId = $employeeId
    location = @{
        lat = 28.2813776
        lng = 76.8792912
        address = "Test Location for Exact Start Time"
    }
    clientName = "Test Client - Exact Start Time"
    notes = "Testing exact start time preservation"
    startTime = $userClickTime
} | ConvertTo-Json -Depth 3

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings" -Method POST -Body $meetingData -ContentType "application/json" -ErrorAction Stop
    
    $meetingId = $createResponse.id
    $returnedStartTime = $createResponse.startTime
    
    Write-Host "Meeting created successfully!" -ForegroundColor Green
    Write-Host "Meeting ID: $meetingId" -ForegroundColor Green
    Write-Host "User Click Time: $userClickTime" -ForegroundColor Green
    Write-Host "Returned Start Time: $returnedStartTime" -ForegroundColor Green
    Write-Host "Status: $($createResponse.status)" -ForegroundColor Green
    
    # Step 3: Verify exact time preservation
    Write-Host ""
    Write-Host "Step 3: Verifying exact start time preservation..." -ForegroundColor Yellow
    
    if ($userClickTime -eq $returnedStartTime) {
        Write-Host "SUCCESS: Exact start time was preserved!" -ForegroundColor Green
        Write-Host "   User Click: $userClickTime" -ForegroundColor Green
        Write-Host "   Database:   $returnedStartTime" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Start time was modified!" -ForegroundColor Red
        Write-Host "   User Click: $userClickTime" -ForegroundColor Red
        Write-Host "   Database:   $returnedStartTime" -ForegroundColor Red
        
        # Calculate the difference
        $userTime = [DateTime]::Parse($userClickTime)
        $dbTime = [DateTime]::Parse($returnedStartTime)
        $difference = ($dbTime - $userTime).TotalMilliseconds
        Write-Host "   Difference: $difference milliseconds" -ForegroundColor Red
    }
    
    # Step 4: Wait and then end the meeting to test full flow
    Write-Host ""
    Write-Host "Step 4: Waiting 2 seconds then ending meeting..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    $endTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    $endMeetingData = @{
        status = "completed"
        endTime = $endTime
        meetingDetails = @{
            discussion = "Test discussion - exact start time verification"
            customers = @(
                @{
                    customerName = "Test Customer"
                    customerEmployeeName = "Test Employee"
                    customerEmail = "test@example.com"
                    customerMobile = "1234567890"
                    customerDesignation = "Test Role"
                }
            )
            attachments = @()
        }
        endLocation = @{
            lat = 28.2813776
            lng = 76.8792912
            address = "End Location for Exact Start Time Test"
            timestamp = $endTime
        }
    } | ConvertTo-Json -Depth 4
    
    $endResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" -Method PUT -Body $endMeetingData -ContentType "application/json" -ErrorAction Stop
    
    $finalStartTime = $endResponse.startTime
    $finalEndTime = $endResponse.endTime
    
    Write-Host "Meeting ended successfully!" -ForegroundColor Green
    Write-Host "Final Start Time: $finalStartTime" -ForegroundColor Green
    Write-Host "Final End Time: $finalEndTime" -ForegroundColor Green
    
    # Step 5: Final verification
    Write-Host ""
    Write-Host "Step 5: Final verification of exact times..." -ForegroundColor Yellow
    
    $allTimesMatch = ($userClickTime -eq $returnedStartTime) -and ($returnedStartTime -eq $finalStartTime)
    
    if ($allTimesMatch) {
        Write-Host "COMPLETE SUCCESS: All start times match exactly!" -ForegroundColor Green
        Write-Host "   User Click:    $userClickTime" -ForegroundColor Green
        Write-Host "   Create Return: $returnedStartTime" -ForegroundColor Green
        Write-Host "   Final Return:  $finalStartTime" -ForegroundColor Green
        
        # Calculate actual meeting duration
        $startDateTime = [DateTime]::Parse($userClickTime)
        $endDateTime = [DateTime]::Parse($finalEndTime)
        $actualDuration = $endDateTime - $startDateTime
        
        Write-Host ""
        Write-Host "Meeting Duration Analysis:" -ForegroundColor Cyan
        Write-Host "   Actual Start: $($startDateTime.ToString('HH:mm:ss.fff')) UTC" -ForegroundColor Gray
        Write-Host "   Actual End:   $($endDateTime.ToString('HH:mm:ss.fff')) UTC" -ForegroundColor Gray
        Write-Host "   Duration: $($actualDuration.TotalSeconds.ToString('F3')) seconds" -ForegroundColor Gray
        
    } else {
        Write-Host "FAILURE: Start times do not match!" -ForegroundColor Red
        Write-Host "   User Click:    $userClickTime" -ForegroundColor Red
        Write-Host "   Create Return: $returnedStartTime" -ForegroundColor Red
        Write-Host "   Final Return:  $finalStartTime" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error during test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Exact Start Time Test Completed." -ForegroundColor Cyan