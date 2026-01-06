#!/usr/bin/env pwsh

# Test script for Today's Meetings API endpoint
Write-Host "🧪 Testing Today's Meetings API Endpoint" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000"
$employeeId = "6747b8b5e5b4c2a1d8f3e9a1"  # Replace with actual employee ID

Write-Host "📡 Testing endpoint: GET $baseUrl/api/meetings/today?employeeId=$employeeId" -ForegroundColor Yellow

try {
    # Test the new endpoint
    $response = Invoke-RestMethod -Uri "$baseUrl/api/meetings/today?employeeId=$employeeId" -Method GET -ContentType "application/json"
    
    Write-Host "✅ API Response received:" -ForegroundColor Green
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
    
    Write-Host "🎉 Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error testing API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Check if server is running
    try {
        $pingResponse = Invoke-RestMethod -Uri "$baseUrl/api/ping" -Method GET
        Write-Host "✅ Server is running (ping successful)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Server appears to be down. Please start the server first." -ForegroundColor Red
        Write-Host "Run: npm run dev:server" -ForegroundColor Yellow
    }
}

Write-Host "`n📝 Note: Make sure to replace the employeeId with a valid ID from your database" -ForegroundColor Cyan