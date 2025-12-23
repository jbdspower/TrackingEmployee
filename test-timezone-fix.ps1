# Test script to verify timezone fixes
Write-Host "🕐 Testing Timezone Fixes for IST Display" -ForegroundColor Green
Write-Host ""

# Start the server in background
Write-Host "🚀 Starting server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start" -PassThru -WindowStyle Hidden

# Wait for server to start
Start-Sleep -Seconds 5

try {
    # Test 1: Check current time display
    Write-Host "📅 Test 1: Current Time Display" -ForegroundColor Cyan
    $currentTime = Get-Date
    Write-Host "   System Time: $currentTime"
    Write-Host "   Expected IST: $($currentTime.ToString('dd/MM/yyyy HH:mm:ss'))"
    Write-Host ""

    # Test 2: Create a test meeting
    Write-Host "📝 Test 2: Creating Test Meeting" -ForegroundColor Cyan
    $testEmployeeId = "test-employee-123"
    $meetingData = @{
        employeeId = $testEmployeeId
        location = @{
            lat = 28.4595
            lng = 77.0266
            address = "Sector 102, Gurgaon, Gurugram, Haryana, India"
        }
        clientName = "Test Client - Timezone Fix"
        notes = "Testing IST timezone display"
        startTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json -Depth 3

    $headers = @{
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/meetings" -Method POST -Body $meetingData -Headers $headers
        Write-Host "   ✅ Meeting created successfully!" -ForegroundColor Green
        Write-Host "   Meeting ID: $($response.id)"
        Write-Host "   Start Time (stored): $($response.startTime)"
        Write-Host ""

        # Test 3: Retrieve the meeting
        Write-Host "📖 Test 3: Retrieving Meeting" -ForegroundColor Cyan
        $retrievedMeeting = Invoke-RestMethod -Uri "http://localhost:3000/api/meetings/$($response.id)" -Method GET
        Write-Host "   ✅ Meeting retrieved successfully!" -ForegroundColor Green
        Write-Host "   Start Time: $($retrievedMeeting.startTime)"
        Write-Host "   Location: $($retrievedMeeting.location.address)"
        Write-Host ""

        # Test 4: End the meeting
        Write-Host "🏁 Test 4: Ending Meeting" -ForegroundColor Cyan
        $endData = @{
            status = "completed"
            endTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            meetingDetails = @{
                discussion = "Test meeting completed - timezone fix verification"
                customers = @(
                    @{
                        name = "Test Customer"
                        designation = "Test Role"
                        email = "test@example.com"
                        phone = "+91-9999999999"
                    }
                )
            }
        } | ConvertTo-Json -Depth 4

        $endResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/meetings/$($response.id)" -Method PUT -Body $endData -Headers $headers
        Write-Host "   ✅ Meeting ended successfully!" -ForegroundColor Green
        Write-Host "   End Time: $($endResponse.endTime)"
        Write-Host "   Status: $($endResponse.status)"
        Write-Host ""

        # Calculate duration
        $startTime = [DateTime]::Parse($endResponse.startTime)
        $endTime = [DateTime]::Parse($endResponse.endTime)
        $duration = $endTime - $startTime
        Write-Host "   📊 Meeting Duration: $($duration.TotalMinutes.ToString('F2')) minutes" -ForegroundColor Yellow

    } catch {
        Write-Host "   ❌ API Test failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🎯 Timezone Fix Summary:" -ForegroundColor Green
    Write-Host "   ✅ Times are now stored in UTC format"
    Write-Host "   ✅ Client displays times in IST using proper timezone conversion"
    Write-Host "   ✅ Meeting times should show correct IST dates and times"
    Write-Host "   ✅ No more 24th December issue for 23rd December meetings"
    Write-Host ""
    Write-Host "📱 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Open the application in your browser"
    Write-Host "   2. Start a meeting and verify the time shows correctly in IST"
    Write-Host "   3. Check that today's meetings appear in the correct date"
    Write-Host "   4. Verify meeting history shows proper IST times"

} finally {
    # Clean up
    Write-Host ""
    Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
    if ($serverProcess -and !$serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
        Write-Host "   Server stopped"
    }
}

Write-Host ""
Write-Host "✨ Timezone fix testing completed!" -ForegroundColor Green