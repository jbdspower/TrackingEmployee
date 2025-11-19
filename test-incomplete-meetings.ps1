# Test script for incomplete meetings feature
# This script tests the API endpoint for saving incomplete meeting remarks

$baseUrl = "http://localhost:3002"

Write-Host "Testing Incomplete Meetings Feature" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test data
$testData = @{
    employeeId = "test_employee_123"
    reason = "Multiple incomplete meetings"
    pendingMeetings = @(
        @{
            _id = "meeting_001"
            leadId = "JBDSL-0001"
            companyName = "Tech Solutions Inc"
            customerName = "John Doe"
            customerEmail = "john@techsolutions.com"
            customerMobile = "1234567890"
            customerDesignation = "CTO"
            meetingTime = "10:00 AM"
            incompleteReason = "Client requested reschedule to next week"
        },
        @{
            _id = "meeting_002"
            leadId = "JBDSL-0002"
            companyName = "Global Enterprises"
            customerName = "Jane Smith"
            customerEmail = "jane@global.com"
            customerMobile = "0987654321"
            customerDesignation = "CEO"
            meetingTime = "2:00 PM"
            incompleteReason = "Technical issues with video conferencing"
        },
        @{
            _id = "meeting_003"
            leadId = "JBDSL-0003"
            companyName = "Innovation Labs"
            customerName = "Bob Johnson"
            customerEmail = "bob@innovation.com"
            customerMobile = "5555555555"
            customerDesignation = "Director"
            meetingTime = "4:00 PM"
            incompleteReason = "Waiting for management approval"
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Step 1: Testing POST /api/incomplete-meeting-remarks" -ForegroundColor Yellow
Write-Host "Sending test data with 3 incomplete meetings..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/incomplete-meeting-remarks" `
        -Method Post `
        -Body $testData `
        -ContentType "application/json"
    
    Write-Host "✓ Successfully saved incomplete meeting remarks" -ForegroundColor Green
    Write-Host "  - Meetings processed: $($response.meetingsProcessed)" -ForegroundColor Green
    Write-Host "  - Response:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "✗ Failed to save incomplete meeting remarks" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 2: Testing GET /api/incomplete-meeting-remarks" -ForegroundColor Yellow
Write-Host "Fetching incomplete meetings for employee..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/incomplete-meeting-remarks?employeeId=test_employee_123" `
        -Method Get
    
    Write-Host "✓ Successfully retrieved incomplete meeting remarks" -ForegroundColor Green
    Write-Host "  - Total meetings found: $($response.meetings.Count)" -ForegroundColor Green
    
    if ($response.meetings.Count -gt 0) {
        Write-Host "  - Meeting details:" -ForegroundColor Gray
        foreach ($meeting in $response.meetings) {
            $companyName = $meeting.leadInfo.companyName
            $reason = $meeting.meetingDetails.incompleteReason
            Write-Host "    • $companyName : $reason" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "✗ Failed to retrieve incomplete meeting remarks" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 3: Testing GET /api/meeting-history (with incomplete filter)" -ForegroundColor Yellow
Write-Host "Fetching all meeting history for employee..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meeting-history?employeeId=test_employee_123&limit=50" `
        -Method Get
    
    Write-Host "✓ Successfully retrieved meeting history" -ForegroundColor Green
    Write-Host "  - Total meetings: $($response.meetings.Count)" -ForegroundColor Green
    
    $incompleteMeetings = $response.meetings | Where-Object { $_.meetingDetails.incomplete -eq $true }
    Write-Host "  - Incomplete meetings: $($incompleteMeetings.Count)" -ForegroundColor Green
    
    if ($incompleteMeetings.Count -gt 0) {
        Write-Host "  - Incomplete meeting details:" -ForegroundColor Gray
        foreach ($meeting in $incompleteMeetings) {
            $companyName = $meeting.leadInfo.companyName
            $reason = $meeting.meetingDetails.incompleteReason
            $timestamp = $meeting.timestamp
            Write-Host "    • $companyName : $reason (at $timestamp)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "✗ Failed to retrieve meeting history" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Make sure the server is running on $baseUrl" -ForegroundColor Yellow
