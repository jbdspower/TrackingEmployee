#!/usr/bin/env pwsh

Write-Host "🔍 Testing Meeting Timing Fix for Approval Meetings" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Test the analytics API to check meeting times
$baseUrl = "http://localhost:3000"

Write-Host "`n1. Testing Analytics API for meeting times..." -ForegroundColor Yellow

try {
    # Get all employees to find one with meetings
    $employeesResponse = Invoke-RestMethod -Uri "$baseUrl/api/analytics/employees?dateRange=today" -Method GET
    
    if ($employeesResponse.analytics -and $employeesResponse.analytics.Count -gt 0) {
        $employeeWithMeetings = $employeesResponse.analytics | Where-Object { $_.totalMeetings -gt 0 } | Select-Object -First 1
        
        if ($employeeWithMeetings) {
            Write-Host "✅ Found employee with meetings: $($employeeWithMeetings.employeeName)" -ForegroundColor Green
            
            # Get detailed employee data
            $detailsResponse = Invoke-RestMethod -Uri "$baseUrl/api/analytics/employee-details/$($employeeWithMeetings.employeeId)?dateRange=today" -Method GET
            
            if ($detailsResponse.meetingRecords -and $detailsResponse.meetingRecords.Count -gt 0) {
                Write-Host "`n📊 Meeting Records Analysis:" -ForegroundColor Cyan
                
                foreach ($meeting in $detailsResponse.meetingRecords) {
                    Write-Host "  Company: $($meeting.companyName)" -ForegroundColor White
                    Write-Host "  Meeting In Time: $($meeting.meetingInTime)" -ForegroundColor Green
                    Write-Host "  Meeting Out Time: $($meeting.meetingOutTime)" -ForegroundColor Red
                    Write-Host "  Status: $($meeting.meetingStatus)" -ForegroundColor Yellow
                    
                    if ($meeting.meetingInTime -eq $meeting.meetingOutTime -and $meeting.meetingOutTime -ne "In Progress") {
                        Write-Host "  ❌ ISSUE FOUND: Meeting in and out times are the same!" -ForegroundColor Red
                    } elseif ($meeting.meetingInTime -ne $meeting.meetingOutTime) {
                        Write-Host "  ✅ Times are different - working correctly!" -ForegroundColor Green
                    }
                    Write-Host "  ---" -ForegroundColor Gray
                }
            } else {
                Write-Host "⚠️ No meeting records found for today" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️ No employees with meetings found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Failed to get employee analytics" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error testing analytics API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing direct meetings API..." -ForegroundColor Yellow

try {
    # Get meetings directly from the meetings API
    $meetingsResponse = Invoke-RestMethod -Uri "$baseUrl/api/meetings?limit=10" -Method GET
    
    if ($meetingsResponse.meetings -and $meetingsResponse.meetings.Count -gt 0) {
        Write-Host "✅ Found $($meetingsResponse.meetings.Count) meetings" -ForegroundColor Green
        
        Write-Host "`n📊 Direct Meeting Data Analysis:" -ForegroundColor Cyan
        
        foreach ($meeting in $meetingsResponse.meetings) {
            Write-Host "  ID: $($meeting.id)" -ForegroundColor White
            Write-Host "  Client: $($meeting.clientName)" -ForegroundColor White
            Write-Host "  Start Time: $($meeting.startTime)" -ForegroundColor Green
            Write-Host "  End Time: $($meeting.endTime)" -ForegroundColor Red
            Write-Host "  Status: $($meeting.status)" -ForegroundColor Yellow
            
            if ($meeting.startTime -and $meeting.endTime) {
                $startTime = [DateTime]::Parse($meeting.startTime)
                $endTime = [DateTime]::Parse($meeting.endTime)
                $duration = $endTime - $startTime
                
                Write-Host "  Duration: $($duration.TotalMinutes) minutes" -ForegroundColor Cyan
                
                if ($duration.TotalMinutes -lt 1) {
                    Write-Host "  ❌ ISSUE: Duration is less than 1 minute!" -ForegroundColor Red
                } else {
                    Write-Host "  ✅ Duration looks normal" -ForegroundColor Green
                }
            }
            Write-Host "  ---" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️ No meetings found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error testing meetings API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Testing Today's Meetings External API..." -ForegroundColor Yellow

try {
    # Test the external API that provides today's meetings
    $externalApiUrl = "https://jbdspower.in/LeafNetServer/api/getFollowUpHistory"
    
    # You would need a valid userId here - this is just a test
    Write-Host "ℹ️ External API URL: $externalApiUrl" -ForegroundColor Blue
    Write-Host "ℹ️ Note: Need valid userId to test external API" -ForegroundColor Blue
    
} catch {
    Write-Host "❌ Error testing external API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Summary:" -ForegroundColor Cyan
Write-Host "- The fix ensures approval meetings use the same timing functions as normal meetings" -ForegroundColor White
Write-Host "- Both startMeeting and startMeetingFromFollowUp capture exact timestamps" -ForegroundColor White
Write-Host "- The updateMeeting API preserves original startTime and uses exact endTime" -ForegroundColor White
Write-Host "- If times are still showing the same, check the database directly" -ForegroundColor White

Write-Host "`n✅ Test completed!" -ForegroundColor Green