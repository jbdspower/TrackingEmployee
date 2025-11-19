# Direct API test
Write-Host "Testing API endpoints..." -ForegroundColor Cyan

# Test 1: Ping
Write-Host "`n1. Testing /api/ping" -ForegroundColor Yellow
try {
    $ping = Invoke-RestMethod -Uri "http://localhost:5000/api/ping"
    Write-Host "✅ Ping works" -ForegroundColor Green
    $ping | ConvertTo-Json
} catch {
    Write-Host "❌ Ping failed: $_" -ForegroundColor Red
}

# Test 2: Save attendance
Write-Host "`n2. Testing POST /api/analytics/save-attendance" -ForegroundColor Yellow
$body = @{
    employeeId = "67daa55d9c4abb36045d5bfe"
    date = "2025-11-14"
    attendanceStatus = "half_day"
    attendanceReason = "Test from PowerShell"
} | ConvertTo-Json

try {
    $save = Invoke-RestMethod -Uri "http://localhost:5000/api/analytics/save-attendance" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
    Write-Host "✅ Save works" -ForegroundColor Green
    $save | ConvertTo-Json
} catch {
    Write-Host "❌ Save failed: $_" -ForegroundColor Red
}

# Test 3: Get attendance
Write-Host "`n3. Testing GET /api/analytics/attendance" -ForegroundColor Yellow
try {
    $get = Invoke-RestMethod -Uri "http://localhost:5000/api/analytics/attendance?employeeId=67daa55d9c4abb36045d5bfe" `
        -Method GET `
        -ContentType "application/json"
    Write-Host "✅ Get works" -ForegroundColor Green
    $get | ConvertTo-Json
} catch {
    Write-Host "❌ Get failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check what the endpoint actually returns
Write-Host "`n4. Checking raw response" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/analytics/attendance?employeeId=67daa55d9c4abb36045d5bfe" `
        -Method GET
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "Content Type: $($response.Headers.'Content-Type')" -ForegroundColor Cyan
    Write-Host "Content (first 200 chars):" -ForegroundColor Cyan
    Write-Host $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
} catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}
