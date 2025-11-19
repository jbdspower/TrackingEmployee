# Deploy via Git - Complete Workflow
# This script builds the project and pushes to Git

Write-Host "=== Deploy via Git Workflow ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Git status
Write-Host "1. Checking Git status..." -ForegroundColor Yellow
git status

$continue = Read-Host "`nDo you want to continue? (y/n)"
if ($continue -ne "y") {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    exit
}

# Step 2: Switch to production
Write-Host "`n2. Switching to production environment..." -ForegroundColor Yellow
.\switch-environment.ps1 prod

# Step 3: Clean old build
Write-Host "`n3. Cleaning old build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "   ✅ Cleaned dist/ folder" -ForegroundColor Green
}

# Step 4: Build the project
Write-Host "`n4. Building project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build successful!" -ForegroundColor Green

# Step 5: Verify build
Write-Host "`n5. Verifying build output..." -ForegroundColor Yellow
$checks = @(
    @{Path="dist/spa/index.html"; Name="Frontend index.html"},
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

# Step 6: Git add
Write-Host "`n6. Adding files to Git..." -ForegroundColor Yellow
git add .
Write-Host "   ✅ Files added" -ForegroundColor Green

# Step 7: Git commit
Write-Host "`n7. Committing changes..." -ForegroundColor Yellow
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Production build - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

git commit -m "$commitMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Nothing to commit or commit failed" -ForegroundColor Yellow
    $forcePush = Read-Host "Continue with push anyway? (y/n)"
    if ($forcePush -ne "y") {
        exit 1
    }
}
Write-Host "   ✅ Changes committed" -ForegroundColor Green

# Step 8: Git push
Write-Host "`n8. Pushing to remote repository..." -ForegroundColor Yellow
$branch = git branch --show-current
Write-Host "   Pushing to branch: $branch" -ForegroundColor Cyan

git push origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Push successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Push failed!" -ForegroundColor Red
    exit 1
}

# Step 9: Show next steps
Write-Host "`n✅ Code pushed to Git successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "NEXT STEPS - On Hostinger Server:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SSH into your Hostinger server" -ForegroundColor White
Write-Host ""
Write-Host "2. Navigate to your project:" -ForegroundColor White
Write-Host "   cd /home/your-username/domains/tracking.jbdspower.in" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Pull the latest code:" -ForegroundColor White
Write-Host "   git pull origin $branch" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Install dependencies:" -ForegroundColor White
Write-Host "   npm install --production" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Restart the application:" -ForegroundColor White
Write-Host "   pm2 restart tracking-app" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Check logs:" -ForegroundColor White
Write-Host "   pm2 logs tracking-app" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or use the quick deploy script on server:" -ForegroundColor Yellow
Write-Host "   bash deploy-on-server.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app will be live at: https://tracking.jbdspower.in" -ForegroundColor Green
Write-Host ""
