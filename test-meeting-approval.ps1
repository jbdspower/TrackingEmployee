# Test Meeting Approval Functionality
# This script tests the new meeting approval feature

Write-Host "🧪 Testing Meeting Approval Functionality" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"

# Test 1: Get meetings to find a meeting ID
Write-Host "📋 Test 1: Fetching meetings..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings?limit=1" -Method Get
    if ($response.meetings -and $response.meetings.Count -gt 0) {
        $meetingId = $response.meetings[0].id
        Write-Host "✅ Found meeting ID: $meetingId" -ForegroundColor Green
        
        # Test 2: Update meeting approval
        Write-Host ""
        Write-Host "📝 Test 2: Updating meeting approval..." -ForegroundColor Yellow
        
        $approvalData = @{
            approvalStatus = "ok"
            approvalReason = "Meeting was productive and all objectives were met"
        } | ConvertTo-Json
        
        try {
            $approvalResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId/approval" `
                -Method Put `
                -Body $approvalData `
                -ContentType "application/json"
            
            Write-Host "✅ Meeting approval updated successfully!" -ForegroundColor Green
            Write-Host "   Status: $($approvalResponse.approvalStatus)" -ForegroundColor White
            Write-Host "   Reason: $($approvalResponse.approvalReason)" -ForegroundColor White
        } catch {
            Write-Host "❌ Failed to update meeting approval: $_" -ForegroundColor Red
        }
        
        # Test 3: Verify the approval was saved
        Write-Host ""
        Write-Host "🔍 Test 3: Verifying approval was saved..." -ForegroundColor Yellow
        try {
            $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId" -Method Get
            if ($verifyResponse.approvalStatus) {
                Write-Host "✅ Approval verified!" -ForegroundColor Green
                Write-Host "   Status: $($verifyResponse.approvalStatus)" -ForegroundColor White
                Write-Host "   Reason: $($verifyResponse.approvalReason)" -ForegroundColor White
            } else {
                Write-Host "⚠️  Approval fields not found in response" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Failed to verify approval: $_" -ForegroundColor Red
        }
        
        # Test 4: Test validation (missing reason)
        Write-Host ""
        Write-Host "🧪 Test 4: Testing validation (missing reason)..." -ForegroundColor Yellow
        
        $invalidData = @{
            approvalStatus = "not_ok"
            approvalReason = ""
        } | ConvertTo-Json
        
        try {
            $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings/$meetingId/approval" `
                -Method Put `
                -Body $invalidData `
                -ContentType "application/json" `
                -ErrorAction Stop
            
            Write-Host "⚠️  Validation should have failed but didn't" -ForegroundColor Yellow
        } catch {
            if ($_.Exception.Response.StatusCode -eq 400) {
                Write-Host "✅ Validation working correctly (rejected empty reason)" -ForegroundColor Green
            } else {
                Write-Host "❌ Unexpected error: $_" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "⚠️  No meetings found. Please create a meeting first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to fetch meetings: $_" -ForegroundColor Red
    Write-Host "   Make sure the server is running on $baseUrl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete!" -ForegroundColor Cyan
