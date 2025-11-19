Write-Host "=== Quick Attendance API Test ===" -ForegroundColor Cyan
Write-Host "Testing on http://localhost:5000`n" -ForegroundColor White

$employeeId = "67daa55d9c4abb36045d5bfe"
$date = "2025-11-14"

# Test 1: Ping
Write-Host "1. Testing server..." -ForegroundColor Yellow
try {
    $ping = Invoke-RestMethod -Uri "http://localhost:5000/api/ping"
    Write-Host "   ✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server not responding. Is it running? (npm run dev)" -ForegroundColor Red
    exit
}

# Test 2: Save
Write-Host "`n2. Saving attendance..." -ForegroundColor Yellow
$body = @{
    employeeId = $employeeId
    date = $date
    attendanceStatus = "half_day"
    attendanceReason = "Quick test from PowerShell"
} | ConvertTo-Json

try {
    $save = Invoke-RestMethod -Uri "http://localhost:5000/api/analytics/save-attendance" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
    Write-Host "   ✅ Saved successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Save failed: $_" -ForegroundColor Red
}

# Test 3: Get
Write-Host "`n3. Retrieving attendance..." -ForegroundColor Yellow
try {
    $get = Invoke-RestMethod -Uri "http://localhost:5000/api/analytics/attendance?employeeId=$employeeId"
    Write-Host "   ✅ Retrieved $($get.count) record(s)" -ForegroundColor Green
    
    if ($get.count -gt 0) {
        Write-Host "`n   📋 Attendance Records:" -ForegroundColor Cyan
        foreach ($record in $get.data) {
            Write-Host "      Date: $($record.date)" -ForegroundColor White
            Write-Host "      Status: $($record.attendanceStatus)" -ForegroundColor White
            Write-Host "      Reason: $($record.attendanceReason)" -ForegroundColor White
            Write-Host ""
        }
    }
} catch {
    Write-Host "   ❌ Get failed: $_" -ForegroundColor Red
}

Write-Host "`n✅ API Test Complete!" -ForegroundColor Green
Write-Host "`n📱 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open http://localhost:5000 in your browser" -ForegroundColor White
Write-Host "   2. Go to Analytics Dashboard" -ForegroundColor White
Write-Host "   3. Click 'View Details' on employee: $employeeId" -ForegroundColor White
Write-Host "   4. Open browser console (F12) to see logs" -ForegroundColor White
Write-Host "   5. Check the 'Daily Summary' table for attendance data" -ForegroundColor White
