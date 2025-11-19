# Test script for attendance API

Write-Host "Testing Attendance API..." -ForegroundColor Cyan

# Test 1: Save attendance
Write-Host "`n1. Testing POST /api/analytics/save-attendance" -ForegroundColor Yellow
$saveBody = @{
    employeeId = "67daa55d9c4abb36045d5bfe"
    date = "2025-11-14"
    attendanceStatus = "half_day"
    attendanceReason = "Medical appointment"
} | ConvertTo-Json

try {
    $saveResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/analytics/save-attendance" `
        -Method POST `
        -Body $saveBody `
        -ContentType "application/json"
    
    Write-Host "✓ Save Response:" -ForegroundColor Green
    $saveResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Save Failed: $_" -ForegroundColor Red
}

# Test 2: Get attendance for specific employee
Write-Host "`n2. Testing GET /api/analytics/attendance?employeeId=..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/analytics/attendance?employeeId=67daa55d9c4abb36045d5bfe" `
        -Method GET
    
    Write-Host "✓ Get Response:" -ForegroundColor Green
    $getResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Get Failed: $_" -ForegroundColor Red
}

# Test 3: Get attendance for specific date
Write-Host "`n3. Testing GET /api/analytics/attendance?date=..." -ForegroundColor Yellow
try {
    $dateResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/analytics/attendance?date=2025-11-14" `
        -Method GET
    
    Write-Host "✓ Date Response:" -ForegroundColor Green
    $dateResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Date Query Failed: $_" -ForegroundColor Red
}

# Test 4: Get attendance for date range
Write-Host "`n4. Testing GET /api/analytics/attendance?startDate=...&endDate=..." -ForegroundColor Yellow
try {
    $rangeResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/analytics/attendance?employeeId=67daa55d9c4abb36045d5bfe&startDate=2025-11-01&endDate=2025-11-30" `
        -Method GET
    
    Write-Host "✓ Range Response:" -ForegroundColor Green
    $rangeResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Range Query Failed: $_" -ForegroundColor Red
}

Write-Host "`nAll tests completed!" -ForegroundColor Cyan
