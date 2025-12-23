# Test Start Time Preservation
# This script tests that ending a meeting preserves the original start time

$baseUrl = "http://localhost:5000"
$employeeId = "686616b28bbe842c04a815f0"

Write-Host "🧪 Testing Start Time Preservation..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "Employee ID: $employeeId" -ForegroundColor Gray

# Step 1: Create a meeting
Write-Host ""
Write-Host "📝 Step 1: Creating a new meeting..." -ForegroundColor Yellow

$meetingData = @{
    employeeId = $employeeId
    location = @{
        lat = 28.2813776
        lng = 76.8792912
        address = "Test Location for Start Time Preservation"
    }
    clientName = "Test Client - Start Time Preservation"
    notes = "Testing that start time is preserved when ending meeting"
} | ConvertTo-Json -Depth 3

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings" -Method POST -Body $meetingData -ContentType "application/json" -ErrorAction Stop
    
    $meetingId = $createResponse.id
    $originalStartTime = $createResponse.startTime
    
    Write-Host "✅ Meeting created successfully!" -ForegroundColor Green
    Write-Host "Meeting ID: $meetingId" -ForegroundColor Green
    Write-Host "Original Start Time: $originalStartTime" -ForegroundColor Green
    Write-Host "Status: $($createResponse.status)" -ForegroundColor Green
    
    # Wait a few seconds to ensure different timestamps
    Write-Host ""
    Write-Host "⏳ Waiting 3 seconds to ensure different timestamps..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Step 2: End the meeting
    Write-Host ""
    Write-Host "📝 Step 2: Ending the meeting..." -ForegroundColor Yellow
    
    $endMeetingData = @{
        status = "completed"
        endTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        meetingDetails = @{
            discussion = "Test discussion - verifying start time preservation"
            customers = @(
                @{
                    name = "Test Customer"
                    email = "test@example.com"
                    phone = "1234567890"
                    designation = "Test Role"
                }
            )
            attachments = @()
        }
        endLocation = @{
            lat = 28.2813776
            lng = 76.8792912
            address = "End Location for Start Time Test"
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
    } | ConvertTo-Json -Depth 4
    
    $endResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" -Method PUT -Body $endMeetingData -ContentType "application/json" -ErrorAction Stop
    
    $finalStartTime = $endResponse.startTime
    $finalEndTime = $endResponse.endTime
    
    Write-Host "✅ Meeting ended successfully!" -ForegroundColor Green
    Write-Host "Final Start Time: $finalStartTime" -ForegroundColor Green
    Write-Host "Final End Time: $finalEndTime" -ForegroundColor Green
    Write-Host "Status: $($endResponse.status)" -ForegroundColor Green
    
    # Step 3: Verify start time preservation
    Write-Host ""
    Write-Host "🔍 Step 3: Verifying start time preservation..." -ForegroundColor Yellow
    
    if ($originalStartTime -eq $finalStartTime) {
        Write-Host "✅ SUCCESS: Start time was preserved correctly!" -ForegroundColor Green
        Write-Host "   Original: $originalStartTime" -ForegroundColor Green
        Write-Host "   Final:    $finalStartTime" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILURE: Start time was changed!" -ForegroundColor Red
        Write-Host "   Original: $originalStartTime" -ForegroundColor Red
        Write-Host "   Final:    $finalStartTime" -ForegroundColor Red
        Write-Host "   This indicates the bug is still present." -ForegroundColor Red
    }
    
    # Calculate meeting duration
    $startDateTime = [DateTime]::Parse($originalStartTime)
    $endDateTime = [DateTime]::Parse($finalEndTime)
    $duration = $endDateTime - $startDateTime
    
    Write-Host ""
    Write-Host "📊 Meeting Duration Analysis:" -ForegroundColor Cyan
    Write-Host "   Start: $($startDateTime.ToString('yyyy-MM-dd HH:mm:ss')) UTC" -ForegroundColor Gray
    Write-Host "   End:   $($endDateTime.ToString('yyyy-MM-dd HH:mm:ss')) UTC" -ForegroundColor Gray
    Write-Host "   Duration: $($duration.TotalMinutes.ToString('F2')) minutes" -ForegroundColor Gray
    
    # Step 4: Verify by fetching the meeting again
    Write-Host ""
    Write-Host "🔍 Step 4: Double-checking by fetching meeting..." -ForegroundColor Yellow
    
    $fetchResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" -Method GET -ErrorAction Stop
    
    if ($fetchResponse.startTime -eq $originalStartTime) {
        Write-Host "✅ DOUBLE VERIFIED: Start time is correct in database!" -ForegroundColor Green
    } else {
        Write-Host "❌ DATABASE ISSUE: Start time in database is wrong!" -ForegroundColor Red
        Write-Host "   Expected: $originalStartTime" -ForegroundColor Red
        Write-Host "   Database: $($fetchResponse.startTime)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error during test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Start Time Preservation Test Completed." -ForegroundColor Cyan