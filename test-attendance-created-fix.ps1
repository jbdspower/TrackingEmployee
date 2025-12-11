# Test script to verify attendenceCreated field is returned in GET API

Write-Host "Testing Attendance Created Field Fix" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test parameters
$baseUrl = "https://tracking.jbdspower.in"
$employeeId = "68b15c60979ea954efbd880a"

Write-Host "Step 1: Fetching attendance records for employee $employeeId" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analytics/attendance?employeeId=$employeeId" -Method Get
    
    Write-Host "✓ API Response received" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response Data:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    Write-Host ""
    
    if ($response.data -and $response.data.Count -gt 0) {
        Write-Host "Found $($response.data.Count) attendance record(s)" -ForegroundColor Green
        Write-Host ""
        
        foreach ($record in $response.data) {
            Write-Host "Record Details:" -ForegroundColor Cyan
            Write-Host "  - Date: $($record.date)"
            Write-Host "  - Status: $($record.attendanceStatus)"
            Write-Host "  - Reason: $($record.attendanceReason)"
            
            if ($record.PSObject.Properties.Name -contains 'attendenceCreated') {
                Write-Host "  - ✓ attendenceCreated ID: $($record.attendenceCreated)" -ForegroundColor Green
            } else {
                Write-Host "  - ✗ attendenceCreated field MISSING" -ForegroundColor Red
            }
            
            if ($record.PSObject.Properties.Name -contains 'attendenceCreatedName') {
                Write-Host "  - ✓ attendenceCreatedName: $($record.attendenceCreatedName)" -ForegroundColor Green
            } else {
                Write-Host "  - ✗ attendenceCreatedName field MISSING" -ForegroundColor Red
            }
            
            Write-Host "  - Saved At: $($record.savedAt)"
            Write-Host ""
        }
        
        # Check if the fix is working
        $hasAttendenceCreated = $response.data[0].PSObject.Properties.Name -contains 'attendenceCreated'
        $hasAttendenceCreatedName = $response.data[0].PSObject.Properties.Name -contains 'attendenceCreatedName'
        
        if ($hasAttendenceCreated -and $hasAttendenceCreatedName) {
            Write-Host "✓ FIX VERIFIED: Both attendenceCreated and attendenceCreatedName fields are present!" -ForegroundColor Green
        } else {
            Write-Host "✗ FIX NOT WORKING: Missing required fields" -ForegroundColor Red
        }
    } else {
        Write-Host "No attendance records found for this employee" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan
