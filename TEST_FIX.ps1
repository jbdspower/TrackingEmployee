Write-Host "=== Testing Attendance API Fix ===" -ForegroundColor Cyan
Write-Host ""

$employeeId = "67daa55d9c4abb36045d5bfe"
$date = "2025-11-14"

# Step 1: Save attendance
Write-Host "1. Saving attendance..." -ForegroundColor Yellow
$body = @{
    employeeId = $employeeId
    date = $date
    attendanceStatus = "half_day"
    attendanceReason = "Testing the fix"
} | ConvertTo-Json

try {
    $saveResult = Invoke-RestMethod -Uri "http://localhost:5000/api/analytics/save-attendance" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "   ✅ Save successful!" -ForegroundColor Green
    Write-Host "   ID: $($saveResult.data.id)" -ForegroundColor Cyan
    Write-Host "   Status: $($saveResult.data.attendanceStatus)" -ForegroundColor Cyan
    Write-Host "   Reason: $($saveResult.data.attendanceReason)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Save failed: $_" -ForegroundColor Red
    exit
}

# Step 2: Get attendance
Write-Host "`n2. Getting attendance..." -ForegroundColor Yellow
try {
    $getResult = Invoke-RestMethod -Uri "http://localhost:5000/api/analytics/attendance?employeeId=$employeeId"
    
    if ($getResult.success -and $getResult.count -gt 0) {
        Write-Host "   ✅ Get successful!" -ForegroundColor Green
        Write-Host "   Found: $($getResult.count) record(s)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   📋 Attendance Records:" -ForegroundColor Cyan
        foreach ($record in $getResult.data) {
            Write-Host "      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
            Write-Host "      Date: $($record.date)" -ForegroundColor White
            Write-Host "      Status: $($record.attendanceStatus)" -ForegroundColor White
            Write-Host "      Reason: $($record.attendanceReason)" -ForegroundColor White
            Write-Host "      Saved: $($record.savedAt)" -ForegroundColor DarkGray
        }
        Write-Host "      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    } else {
        Write-Host "   ⚠️  No attendance records found" -ForegroundColor Yellow
        Write-Host "   Response: $($getResult | ConvertTo-Json)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "   ❌ Get failed: $_" -ForegroundColor Red
    Write-Host "   This might mean the route is still broken" -ForegroundColor Red
    exit
}

Write-Host "`n✅ Fix verified! The API is working correctly." -ForegroundColor Green
Write-Host ""
Write-Host "📱 Next: Test in Dashboard" -ForegroundColor Yellow
Write-Host "   1. Restart your dev server (Ctrl+C, then npm run dev)" -ForegroundColor White
Write-Host "   2. Open http://localhost:5000" -ForegroundColor White
Write-Host "   3. Go to Analytics Dashboard" -ForegroundColor White
Write-Host "   4. Click 'View Details' on employee: $employeeId" -ForegroundColor White
Write-Host "   5. Check the Daily Summary table for date: $date" -ForegroundColor White
Write-Host "   6. You should see:" -ForegroundColor White
Write-Host "      - Attendance Status: half_day" -ForegroundColor Cyan
Write-Host "      - Reason: Testing the fix" -ForegroundColor Cyan
