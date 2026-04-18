#!/usr/bin/env pwsh

# Test script for Today's Meetings API Endpoints
Write-Host "🧪 Testing Today's Meetings API Endpoints" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000"
$employeeId = "6747b8b5e5b4c2a1d8f3e9a1"  # Replace with actual employee ID

# Get today's date range
$today = Get-Date -Hour 0 -Minute 0 -Second 0 -Millisecond 0
$tomorrow = $today.AddDays(1)
$todayISO = $today.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$tomorrowISO = $tomorrow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

Write-Host "📅 Testing for date range: $todayISO to $tomorrowISO" -ForegroundColor Yellow

# Test 1: Try the new dedicated endpoint
Write-Host "`n🎯 Test 1: Dedicated endpoint" -ForegroundColor Cyan
Write-Host "📡 Testing: GET $baseUrl/api/meetings/today?employeeId=$employeeId" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/today?employeeId=$employeeId" -Method GET -ContentType "application/json"
    
    Write-Host "✅ Dedicated API Response received:" -ForegroundColor Green
    Write-Host "📊 Total meetings: $($response.summary.totalMeetings)" -ForegroundColor White
    Write-Host "📊 Completed meetings: $($response.summary.completedMeetings)" -ForegroundColor White
    Write-Host "📊 Total duty hours: $($response.summary.totalDutyHours)" -ForegroundColor White
    Write-Host "📊 Attendance status: $($response.summary.attendanceStatus)" -ForegroundColor White
    
    if ($response.meetings.Count -gt 0) {
        Write-Host "📋 Today's meetings:" -ForegroundColor Cyan
        foreach ($meeting in $response.meetings) {
            $duration = if ($meeting.endTime) {
                $start = [DateTime]::Parse($meeting.startTime)
                $end = [DateTime]::Parse($meeting.endTime)
                $hours = ($end - $start).TotalHours
                "$([Math]::Round($hours, 1)) hours"
            } else {
                "In Progress"
            }
            Write-Host "  • $($meeting.clientName): $duration" -ForegroundColor White
        }
    } else {
        Write-Host "📋 No meetings found for today" -ForegroundColor Yellow
    }
    
    Write-Host "🎉 Dedicated endpoint test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Dedicated endpoint failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Test 2: Fallback to existing API with date filtering
    Write-Host "`n🔄 Test 2: Fallback to existing API with date filtering" -ForegroundColor Cyan
    $fallbackUrl = "$baseUrl/api/meetings?employeeId=$employeeId&startDate=$todayISO&endDate=$tomorrowISO&limit=50"
    Write-Host "📡 Testing: GET $fallbackUrl" -ForegroundColor Yellow
    
    try {
        $fallbackResponse = Invoke-RestMethod -Uri $fallbackUrl -Method GET -ContentType "application/json"
        
        Write-Host "✅ Fallback API Response received:" -ForegroundColor Green
        Write-Host "📊 Total meetings returned: $($fallbackResponse.meetings.Count)" -ForegroundColor White
        
        # Filter for today's meetings
        $todaysMeetings = $fallbackResponse.meetings | Where-Object {
            $meetingDate = [DateTime]::Parse($_.startTime)
            $meetingDate -ge $today -and $meetingDate -lt $tomorrow
        }
        
        Write-Host "📊 Today's meetings after filtering: $($todaysMeetings.Count)" -ForegroundColor White
        
        if ($todaysMeetings.Count -gt 0) {
            Write-Host "📋 Today's meetings:" -ForegroundColor Cyan
            foreach ($meeting in $todaysMeetings) {
                $duration = if ($meeting.endTime) {
                    $start = [DateTime]::Parse($meeting.startTime)
                    $end = [DateTime]::Parse($meeting.endTime)
                    $hours = ($end - $start).TotalHours
                    "$([Math]::Round($hours, 1)) hours"
                } else {
                    "In Progress"
                }
                Write-Host "  • $($meeting.clientName): $duration" -ForegroundColor White
            }
        } else {
            Write-Host "📋 No meetings found for today" -ForegroundColor Yellow
        }
        
        Write-Host "🎉 Fallback endpoint test completed successfully!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Fallback endpoint also failed:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        
        # Check if server is running
        try {
            $pingResponse = Invoke-RestMethod -Uri "$baseUrl/api/ping" -Method GET
            Write-Host "✅ Server is running (ping successful)" -ForegroundColor Green
            Write-Host "❌ Both endpoints failed - there may be a server-side issue" -ForegroundColor Red
        } catch {
            Write-Host "❌ Server appears to be down. Please start the server first." -ForegroundColor Red
            Write-Host "Run: npm run dev:server" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n📝 Notes:" -ForegroundColor Cyan
Write-Host "• Make sure to replace the employeeId with a valid ID from your database" -ForegroundColor White
Write-Host "• The implementation now has fallback support for better reliability" -ForegroundColor White
Write-Host "• If dedicated endpoint fails, it will use existing API with date filtering" -ForegroundColor White