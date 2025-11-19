# Quick Rebuild and Test Script

Write-Host "=== Rebuild and Test for Production ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Switch to production
Write-Host "1. Switching to production environment..." -ForegroundColor Yellow
.\switch-environment.ps1 prod

# Step 2: Clean old build
Write-Host "`n2. Cleaning old build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "   ✅ Cleaned dist/ folder" -ForegroundColor Green
}

# Step 3: Build
Write-Host "`n3. Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Verify build output
Write-Host "`n4. Verifying build output..." -ForegroundColor Yellow

$checks = @(
    @{Path="dist/spa/index.html"; Name="Frontend index.html"},
    @{Path="dist/spa/assets"; Name="Frontend assets"},
    @{Path="dist/server/node-build.mjs"; Name="Server build"}
)

$allGood = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "   ✅ $($check.Name) exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($check.Name) missing!" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host "`n❌ Build verification failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Test locally
Write-Host "`n5. Testing locally..." -ForegroundColor Yellow
Write-Host "   Starting server on http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

$env:NODE_ENV = "production"
npm start
