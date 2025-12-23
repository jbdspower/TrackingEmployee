# Test Active Meeting Endpoint
# This script tests the /api/meetings/active endpoint with various scenarios

$baseUrl = "http://localhost:5001"

Write-Host "Testing Active Meeting Endpoint..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray

# Test 1: Query by followUpId
Write-Host ""
Write-Host "Test 1: Query by followUpId..." -ForegroundColor Yellow
$followUpId = "694a66091310f94fe9295dd1"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/active?followUpId=$followUpId" -Method GET -ErrorAction Stop
    
    Write-Host "SUCCESS: Found active meeting by followUpId" -ForegroundColor Green
    Write-Host "Meeting ID: $($response.id)" -ForegroundColor Green
    Write-Host "Employee ID: $($response.employeeId)" -ForegroundColor Green
    Write-Host "Client Name: $($response.clientName)" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "Follow-up ID: $($response.followUpId)" -ForegroundColor Green
    Write-Host "Start Time: $($response.startTime)" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: Failed to query by followUpId" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Body: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Red
        }
    }
}

# Test 2: Query by employeeId
Write-Host ""
Write-Host "Test 2: Query by employeeId..." -ForegroundColor Yellow
$employeeId = "694a65871310f94fe92958eb"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/active?employeeId=$employeeId" -Method GET -ErrorAction Stop
    
    Write-Host "SUCCESS: Found active meeting by employeeId" -ForegroundColor Green
    Write-Host "Meeting ID: $($response.id)" -ForegroundColor Green
    Write-Host "Employee ID: $($response.employeeId)" -ForegroundColor Green
    Write-Host "Client Name: $($response.clientName)" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: Failed to query by employeeId" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

# Test 3: Query with non-existent followUpId
Write-Host ""
Write-Host "Test 3: Query with non-existent followUpId..." -ForegroundColor Yellow
$nonExistentFollowUpId = "nonexistent123456789"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/active?followUpId=$nonExistentFollowUpId" -Method GET -ErrorAction Stop
    
    Write-Host "UNEXPECTED: Found meeting for non-existent followUpId" -ForegroundColor Yellow
    Write-Host "Meeting ID: $($response.id)" -ForegroundColor Yellow
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    if ($statusCode -eq 404) {
        Write-Host "SUCCESS: Correctly returned 404 for non-existent followUpId" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Unexpected status code: $statusCode" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 4: Query without parameters (should fail)
Write-Host ""
Write-Host "Test 4: Query without parameters..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/active" -Method GET -ErrorAction Stop
    
    Write-Host "UNEXPECTED: Request succeeded without parameters" -ForegroundColor Yellow
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    if ($statusCode -eq 400) {
        Write-Host "SUCCESS: Correctly returned 400 for missing parameters" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Unexpected status code: $statusCode" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Active Meeting Endpoint Test Completed." -ForegroundColor Cyan