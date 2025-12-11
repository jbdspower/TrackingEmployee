# Test script for the new all-employees-details API endpoint

$baseUrl = "https://tracking.jbdspower.in"

Write-Host "Testing All Employees Details API Endpoint" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get all employees details with "all" date range
Write-Host "Test 1: Fetching all employees details (dateRange=all)..." -ForegroundColor Yellow
$url1 = "$baseUrl/api/analytics/all-employees-details?dateRange=all"
Write-Host "URL: $url1" -ForegroundColor Gray

try {
    $response1 = Invoke-RestMethod -Uri $url1 -Method Get -ContentType "application/json"
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Employees: $($response1.totalEmployees)" -ForegroundColor Green
    Write-Host "Date Range: $($response1.dateRange.label) ($($response1.dateRange.start) to $($response1.dateRange.end))" -ForegroundColor Green
    
    if ($response1.employees.Count -gt 0) {
        Write-Host "`nFirst Employee Sample:" -ForegroundColor Cyan
        $firstEmp = $response1.employees[0]
        Write-Host "  Name: $($firstEmp.employeeName)" -ForegroundColor White
        Write-Host "  Email: $($firstEmp.email)" -ForegroundColor White
        Write-Host "  Day Records: $($firstEmp.dayRecords.Count)" -ForegroundColor White
        Write-Host "  Meeting Records: $($firstEmp.meetingRecords.Count)" -ForegroundColor White
        
        if ($firstEmp.dayRecords.Count -gt 0) {
            Write-Host "`n  Sample Day Record:" -ForegroundColor Cyan
            $dayRecord = $firstEmp.dayRecords[0]
            Write-Host "    Date: $($dayRecord.date)" -ForegroundColor White
            Write-Host "    Total Meetings: $($dayRecord.totalMeetings)" -ForegroundColor White
            Write-Host "    Start Location Time: $($dayRecord.startLocationTime)" -ForegroundColor White
            Write-Host "    Out Location Time: $($dayRecord.outLocationTime)" -ForegroundColor White
            Write-Host "    Total Duty Hours: $($dayRecord.totalDutyHours)" -ForegroundColor White
            Write-Host "    Meeting Time: $($dayRecord.meetingTime)" -ForegroundColor White
            Write-Host "    Attendance Added By: $($dayRecord.attendanceAddedBy)" -ForegroundColor White
        }
        
        if ($firstEmp.meetingRecords.Count -gt 0) {
            Write-Host "`n  Sample Meeting Record:" -ForegroundColor Cyan
            $meetingRecord = $firstEmp.meetingRecords[0]
            Write-Host "    Date: $($meetingRecord.date)" -ForegroundColor White
            Write-Host "    Company: $($meetingRecord.companyName)" -ForegroundColor White
            Write-Host "    Lead ID: $($meetingRecord.leadId)" -ForegroundColor White
            Write-Host "    Meeting In Time: $($meetingRecord.meetingInTime)" -ForegroundColor White
            Write-Host "    Meeting Out Time: $($meetingRecord.meetingOutTime)" -ForegroundColor White
            Write-Host "    Total Stay Time: $($meetingRecord.totalStayTime)" -ForegroundColor White
            Write-Host "    Meeting Person: $($meetingRecord.meetingPerson)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "✗ Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n============================================" -ForegroundColor Cyan

# Test 2: Get all employees details with "today" date range
Write-Host "`nTest 2: Fetching all employees details (dateRange=today)..." -ForegroundColor Yellow
$url2 = "$baseUrl/api/analytics/all-employees-details?dateRange=today"
Write-Host "URL: $url2" -ForegroundColor Gray

try {
    $response2 = Invoke-RestMethod -Uri $url2 -Method Get -ContentType "application/json"
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Employees: $($response2.totalEmployees)" -ForegroundColor Green
    Write-Host "Date Range: $($response2.dateRange.label)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n============================================" -ForegroundColor Cyan

# Test 3: Get all employees details with custom date range
Write-Host "`nTest 3: Fetching all employees details (custom date range)..." -ForegroundColor Yellow
$startDate = "2024-12-01"
$endDate = "2024-12-11"
$url3 = "$baseUrl/api/analytics/all-employees-details?dateRange=custom&startDate=$startDate&endDate=$endDate"
Write-Host "URL: $url3" -ForegroundColor Gray

try {
    $response3 = Invoke-RestMethod -Uri $url3 -Method Get -ContentType "application/json"
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "Total Employees: $($response3.totalEmployees)" -ForegroundColor Green
    Write-Host "Date Range: $($response3.dateRange.label) ($startDate to $endDate)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoint: $baseUrl/api/analytics/all-employees-details" -ForegroundColor Cyan
Write-Host ""
Write-Host "Query Parameters:" -ForegroundColor Cyan
Write-Host "  - dateRange: all | today | yesterday | week | month | custom" -ForegroundColor White
Write-Host "  - startDate: YYYY-MM-DD (required for custom range)" -ForegroundColor White
Write-Host "  - endDate: YYYY-MM-DD (required for custom range)" -ForegroundColor White
Write-Host ""
