# PowerShell script to test the meeting end fix

Write-Host "🧪 Testing Meeting End Fix - Tab Close Scenario" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000/api"
$employeeId = "test-employee-123"

# Test data
$startMeetingData = @{
    employeeId = $employeeId
    location = @{
        lat = 28.6139
        lng = 77.2090
        address = "New Delhi, India"
    }
    clientName = "Test Company"
    notes = "Test meeting for tab close scenario"
    followUpId = "test-followup-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json -Depth 3

$endMeetingData = @{
    employeeId = $employeeId
    meetingDetails = @{
        customers = @(
            @{
                customerName = "Test Company"
                customerEmployeeName = "John Doe"
                customerEmail = "john@testcompany.com"
                customerMobile = "+91-9876543210"
                customerDesignation = "Manager"
                customerDepartment = "Sales"
            }
        )
        discussion = "Discussed product requirements and pricing. Follow-up needed for technical specifications."
    }
    endLocation = @{
        lat = 28.6140
        lng = 77.2091
        address = "New Delhi, India"
    }
} | ConvertTo-Json -Depth 4

Write-Host "📋 Test Scenario: User starts meeting, closes tab, reopens and ends meeting" -ForegroundColor Yellow

try {
    # Step 1: Start a meeting
    Write-Host "`n1️⃣ Starting meeting..." -ForegroundColor Green
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/meetings" -Method POST -Body $startMeetingData -ContentType "application/json"
    $meetingId = $startResponse.id
    Write-Host "✅ Meeting started with ID: $meetingId" -ForegroundColor Green

    # Step 2: Simulate tab close by clearing meeting ID (simulate lost local state)
    Write-Host "`n2️⃣ Simulating tab close (losing meeting ID)..." -ForegroundColor Yellow
    Write-Host "⚠️ Local meeting ID lost, user reopens page" -ForegroundColor Yellow

    # Step 3: Try to end meeting without meeting ID (fallback scenario)
    Write-Host "`n3️⃣ Attempting to end meeting using fallback (employeeId only)..." -ForegroundColor Green
    
    # End meeting with empty/null ID to trigger fallback logic
    $endResponse = Invoke-RestMethod -Uri "$baseUrl/meetings/null" -Method PUT -Body $endMeetingData -ContentType "application/json"
    
    Write-Host "✅ Meeting ended successfully using fallback logic!" -ForegroundColor Green
    Write-Host "📊 Meeting Status: $($endResponse.status)" -ForegroundColor Cyan
    Write-Host "📊 Meeting ID: $($endResponse.id)" -ForegroundColor Cyan

    # Step 4: Verify meeting is marked as complete
    Write-Host "`n4️⃣ Verifying meeting completion..." -ForegroundColor Green
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/meetings/$($endResponse.id)" -Method GET
    
    if ($verifyResponse.status -eq "completed") {
        Write-Host "✅ VERIFICATION PASSED: Meeting status is 'completed'" -ForegroundColor Green
    } else {
        Write-Host "❌ VERIFICATION FAILED: Meeting status is '$($verifyResponse.status)'" -ForegroundColor Red
        exit 1
    }

    # Step 5: Check if meeting appears in completed meetings list
    Write-Host "`n5️⃣ Checking completed meetings list..." -ForegroundColor Green
    $completedMeetings = Invoke-RestMethod -Uri "$baseUrl/meetings?employeeId=$employeeId&status=completed" -Method GET
    
    $ourMeeting = $completedMeetings.meetings | Where-Object { $_.id -eq $endResponse.id }
    if ($ourMeeting) {
        Write-Host "✅ VERIFICATION PASSED: Meeting appears in completed meetings list" -ForegroundColor Green
    } else {
        Write-Host "❌ VERIFICATION FAILED: Meeting not found in completed meetings list" -ForegroundColor Red
        exit 1
    }

    # Step 6: Test that no active meetings remain
    Write-Host "`n6️⃣ Verifying no active meetings remain..." -ForegroundColor Green
    try {
        $activeMeeting = Invoke-RestMethod -Uri "$baseUrl/meetings/active?employeeId=$employeeId" -Method GET
        Write-Host "❌ VERIFICATION FAILED: Active meeting still exists: $($activeMeeting.id)" -ForegroundColor Red
        exit 1
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "✅ VERIFICATION PASSED: No active meetings found (expected 404)" -ForegroundColor Green
        } else {
            Write-Host "❌ Unexpected error checking active meetings: $_" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "`n🎉 ALL TESTS PASSED! Tab close scenario fix is working correctly." -ForegroundColor Green
    Write-Host "✅ Users can now end meetings after closing and reopening tabs" -ForegroundColor Green

} catch {
    Write-Host "`n❌ TEST FAILED: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Test Summary:" -ForegroundColor Cyan
Write-Host "- ✅ Meeting can be started normally" -ForegroundColor White
Write-Host "- ✅ Meeting can be ended after tab close (using fallback logic)" -ForegroundColor White
Write-Host "- ✅ Meeting status is properly saved as 'completed'" -ForegroundColor White
Write-Host "- ✅ Meeting appears in completed meetings list" -ForegroundColor White
Write-Host "- ✅ No active meetings remain after completion" -ForegroundColor White