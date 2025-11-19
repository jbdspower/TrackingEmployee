# Test script to verify incomplete meeting remarks API

$employeeId = "67ee54f20b9cda49eeb49d4a"
$baseUrl = "http://localhost:5000"

# Test data - simulating what LocationTracker sends
$testRemark = @{
    employeeId = $employeeId
    reason = "Customer requested rescheduling due to unavailability"
    pendingMeetings = @(
        @{
            _id = "test-meeting-1"
            customerName = "Test Company 1"
            companyName = "Test Company 1"
            customerEmail = "test1@example.com"
            customerMobile = "9999999999"
            customerDesignation = "Manager"
            leadId = "TEST-001"
        },
        @{
            _id = "test-meeting-2"
            customerName = "Test Company 2"
            companyName = "Test Company 2"
            customerEmail = "test2@example.com"
            customerMobile = "8888888888"
            customerDesignation = "Supervisor"
            leadId = "TEST-002"
        }
    )
}

Write-Host "=== TESTING INCOMPLETE MEETING REMARKS API ===" -ForegroundColor Green
Write-Host ""

# 1. POST - Save incomplete remarks
Write-Host "1. POSTing incomplete meeting remarks..." -ForegroundColor Cyan
$postUrl = "$baseUrl/api/incomplete-meeting-remarks"
Write-Host "   URL: $postUrl" -ForegroundColor Gray
Write-Host "   Employee ID: $employeeId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $postUrl -Method Post -Body ($testRemark | ConvertTo-Json -Depth 10) -ContentType "application/json"
    Write-Host "   ✓ POST successful!" -ForegroundColor Green
    Write-Host "   Response:" ($response | ConvertTo-Json -Depth 5) -ForegroundColor Green
} catch {
    Write-Host "   ✗ POST failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# 2. GET - Fetch incomplete remarks
Write-Host "2. GETting incomplete meeting remarks..." -ForegroundColor Cyan
$getUrl = "$baseUrl/api/incomplete-meeting-remarks?employeeId=$employeeId"
Write-Host "   URL: $getUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $getUrl -Method Get
    Write-Host "   ✓ GET successful!" -ForegroundColor Green
    Write-Host "   Total found: $($response.meetings.Count)" -ForegroundColor Green
    if ($response.meetings.Count -gt 0) {
        Write-Host "   Data:" ($response | ConvertTo-Json -Depth 5) -ForegroundColor Green
    } else {
        Write-Host "   ⚠ No incomplete remarks found!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ GET failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# 3. Check if remarks exist with different query
Write-Host "3. Checking all incomplete remarks (no employee filter)..." -ForegroundColor Cyan
$allUrl = "$baseUrl/api/get-incomplete-meeting-remarks?employeeId=$employeeId"
Write-Host "   URL: $allUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $allUrl -Method Get
    Write-Host "   ✓ Query successful!" -ForegroundColor Green
    Write-Host "   Total found: $($response.meetings.Count)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Query failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Green
