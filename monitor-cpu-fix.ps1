#!/usr/bin/env pwsh

# CPU Performance Monitoring Script
# This script helps monitor the effectiveness of the CPU performance fixes

Write-Host "📊 CPU PERFORMANCE MONITORING" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"
if ($args[0]) {
    $baseUrl = $args[0]
}

Write-Host "🌐 Monitoring server: $baseUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: API Response Times
Write-Host "🔍 Test 1: API Response Times" -ForegroundColor Green
Write-Host "------------------------------" -ForegroundColor Green

$endpoints = @(
    "/api/ping",
    "/api/employees",
    "/api/meetings"
)

foreach ($endpoint in $endpoints) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri "$baseUrl$endpoint" -Method GET -TimeoutSec 10
        $stopwatch.Stop()
        
        $responseTime = $stopwatch.ElapsedMilliseconds
        $status = if ($responseTime -lt 1000) { "✅ GOOD" } elseif ($responseTime -lt 3000) { "⚠️  SLOW" } else { "❌ POOR" }
        
        Write-Host "  $endpoint : ${responseTime}ms $status" -ForegroundColor White
    } catch {
        Write-Host "  $endpoint : ❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Database Connection Health
Write-Host "🔍 Test 2: Database Connection Health" -ForegroundColor Green
Write-Host "-------------------------------------" -ForegroundColor Green

try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-RestMethod -Uri "$baseUrl/api/employees" -Method GET -TimeoutSec 15
    $stopwatch.Stop()
    
    $dbResponseTime = $stopwatch.ElapsedMilliseconds
    $employeeCount = $response.employees.Count
    
    Write-Host "  Database Query Time: ${dbResponseTime}ms" -ForegroundColor White
    Write-Host "  Employees Retrieved: $employeeCount" -ForegroundColor White
    
    if ($dbResponseTime -lt 2000) {
        Write-Host "  Database Status: ✅ HEALTHY" -ForegroundColor Green
    } elseif ($dbResponseTime -lt 5000) {
        Write-Host "  Database Status: ⚠️  SLOW" -ForegroundColor Yellow
    } else {
        Write-Host "  Database Status: ❌ POOR" -ForegroundColor Red
    }
} catch {
    Write-Host "  Database Status: ❌ CONNECTION FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Location Update Simulation
Write-Host "🔍 Test 3: Location Update Performance" -ForegroundColor Green
Write-Host "--------------------------------------" -ForegroundColor Green

# Get first employee for testing
try {
    $employees = Invoke-RestMethod -Uri "$baseUrl/api/employees" -Method GET -TimeoutSec 10
    if ($employees.employees.Count -gt 0) {
        $testEmployeeId = $employees.employees[0].id
        Write-Host "  Testing with Employee ID: $testEmployeeId" -ForegroundColor White
        
        # Simulate location update
        $locationData = @{
            lat = 28.6139 + (Get-Random -Minimum -0.01 -Maximum 0.01)
            lng = 77.2090 + (Get-Random -Minimum -0.01 -Maximum 0.01)
            accuracy = 10
        }
        
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri "$baseUrl/api/employees/$testEmployeeId/location" -Method PUT -Body ($locationData | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
        $stopwatch.Stop()
        
        $updateTime = $stopwatch.ElapsedMilliseconds
        Write-Host "  Location Update Time: ${updateTime}ms" -ForegroundColor White
        
        if ($updateTime -lt 1000) {
            Write-Host "  Location Update Status: ✅ FAST" -ForegroundColor Green
        } elseif ($updateTime -lt 3000) {
            Write-Host "  Location Update Status: ⚠️  ACCEPTABLE" -ForegroundColor Yellow
        } else {
            Write-Host "  Location Update Status: ❌ SLOW" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️  No employees found for testing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Location Update Status: ❌ FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Performance Summary
Write-Host "📋 PERFORMANCE SUMMARY" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Performance Optimizations Applied:" -ForegroundColor Green
Write-Host "  • Location polling reduced from 2s to 30s intervals" -ForegroundColor White
Write-Host "  • Movement threshold increased from 2m to 10m" -ForegroundColor White
Write-Host "  • Database connection pool reduced from 50 to 10" -ForegroundColor White
Write-Host "  • API timeouts reduced for faster failures" -ForegroundColor White
Write-Host "  • Geocoding cache extended from 1h to 2h" -ForegroundColor White
Write-Host ""

Write-Host "📊 Expected Results:" -ForegroundColor Yellow
Write-Host "  • CPU Usage: Should be <30% (was 100%)" -ForegroundColor White
Write-Host "  • API Calls: Reduced by 80-90%" -ForegroundColor White
Write-Host "  • Database Timeouts: Significantly reduced" -ForegroundColor White
Write-Host "  • Server Stability: Improved" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Monitoring Recommendations:" -ForegroundColor Yellow
Write-Host "  1. Check Hostinger CPU usage in hosting panel" -ForegroundColor White
Write-Host "  2. Monitor application logs for reduced API call frequency" -ForegroundColor White
Write-Host "  3. Test location tracking with new 30-second intervals" -ForegroundColor White
Write-Host "  4. Verify database connection stability" -ForegroundColor White
Write-Host ""

Write-Host "✅ Monitoring Complete!" -ForegroundColor Green