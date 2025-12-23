# Test Meeting API Endpoint
# This script tests the meeting creation endpoint mentioned in the user's request

$baseUrl = "http://localhost:5000"
$employeeId = "686616b28bbe842c04a815f0"

Write-Host "🧪 Testing Meeting API Endpoint..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "Employee ID: $employeeId" -ForegroundColor Gray

# Test data for creating a meeting
$meetingData = @{
    employeeId = $employeeId
    location = @{
        lat = 28.2813776
        lng = 76.8792912
        address = "MDR132, Manesar, Gurugram, Taoru, Nuh, Haryana, 122105, India"
    }
    clientName = "Testing new lead"
    notes = "Test meeting creation - Issue Resolved: testt"
    followUpId = "694a49971310f94fe9284d99"
} | ConvertTo-Json -Depth 3

Write-Host "`n📤 Sending POST request to create meeting..." -ForegroundColor Yellow
Write-Host "Endpoint: $baseUrl/api/meetings" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings" -Method POST -Body $meetingData -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Meeting created successfully!" -ForegroundColor Green
    Write-Host "Meeting ID: $($response.id)" -ForegroundColor Green
    Write-Host "Client Name: $($response.clientName)" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "Start Time: $($response.startTime)" -ForegroundColor Green
    
    if ($response.followUpId) {
        Write-Host "Follow-up ID: $($response.followUpId)" -ForegroundColor Blue
    }
    
    Write-Host "`n📋 Full Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3 | Write-Host
    
    # Test getting the meeting
    Write-Host "`n📥 Testing GET request for created meeting..." -ForegroundColor Yellow
    $getMeetingUrl = "{0}/api/meetings?employeeId={1}`&limit=1" -f $baseUrl, $employeeId
    $getMeeting = Invoke-RestMethod -Uri $getMeetingUrl -Method GET -ErrorAction Stop
    
    Write-Host "✅ Retrieved meetings successfully!" -ForegroundColor Green
    Write-Host "Total meetings: $($getMeeting.meetings.Count)" -ForegroundColor Green
    
    if ($getMeeting.meetings.Count -gt 0) {
        $latestMeeting = $getMeeting.meetings[0]
        Write-Host "Latest meeting ID: $($latestMeeting.id)" -ForegroundColor Green
        Write-Host "Latest meeting status: $($latestMeeting.status)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error testing meeting API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n🏁 Test completed." -ForegroundColor Cyan