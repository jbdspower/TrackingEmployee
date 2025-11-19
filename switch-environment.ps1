# Environment Switcher Script
# Easily switch between development and production environments

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod", "development", "production")]
    [string]$Environment
)

Write-Host "=== Environment Switcher ===" -ForegroundColor Cyan
Write-Host ""

# Normalize environment name
$env = switch ($Environment) {
    { $_ -in "dev", "development" } { "development"; break }
    { $_ -in "prod", "production" } { "production"; break }
}

Write-Host "Switching to: $env" -ForegroundColor Yellow
Write-Host ""

# Backup current .env
if (Test-Path ".env") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item ".env" ".env.backup.$timestamp"
    Write-Host "✅ Backed up current .env to .env.backup.$timestamp" -ForegroundColor Green
}

# Switch environment
if ($env -eq "development") {
    # Development configuration
    $content = @"
# ============================================
# ENVIRONMENT CONFIGURATION
# ============================================
NODE_ENV=development

# ============================================
# API BASE URL CONFIGURATION
# ============================================
API_BASE_URL=http://localhost:5000

# ============================================
# DATABASE CONFIGURATION
# ============================================
MONGODB_URI=mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/
DB_NAME=employee-tracking

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000

# ============================================
# EXTERNAL APIs
# ============================================
EXTERNAL_USER_API=https://jbdspower.in/LeafNetServer/api/user
EXTERNAL_CUSTOMER_API=https://jbdspower.in/LeafNetServer/api/customer
EXTERNAL_LEAD_API=https://jbdspower.in/LeafNetServer/api/getAllLead

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_LOGGING=true
DEBUG_MODE=false
"@
    
    Set-Content -Path ".env" -Value $content
    Write-Host "✅ Switched to DEVELOPMENT environment" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  API URL: http://localhost:5000" -ForegroundColor White
    Write-Host "  Logging: Enabled" -ForegroundColor White
    Write-Host "  Debug: Disabled" -ForegroundColor White
    Write-Host ""
    Write-Host "To start development server:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    
} else {
    # Production configuration
    $content = @"
# ============================================
# ENVIRONMENT CONFIGURATION
# ============================================
NODE_ENV=production

# ============================================
# API BASE URL CONFIGURATION
# ============================================
API_BASE_URL=https://tracking.jbdspower.in

# ============================================
# DATABASE CONFIGURATION
# ============================================
MONGODB_URI=mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/
DB_NAME=employee-tracking

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000

# ============================================
# EXTERNAL APIs
# ============================================
EXTERNAL_USER_API=https://jbdspower.in/LeafNetServer/api/user
EXTERNAL_CUSTOMER_API=https://jbdspower.in/LeafNetServer/api/customer
EXTERNAL_LEAD_API=https://jbdspower.in/LeafNetServer/api/getAllLead

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_LOGGING=false
DEBUG_MODE=false
"@
    
    Set-Content -Path ".env" -Value $content
    Write-Host "✅ Switched to PRODUCTION environment" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  API URL: https://tracking.jbdspower.in" -ForegroundColor White
    Write-Host "  Logging: Disabled" -ForegroundColor White
    Write-Host "  Debug: Disabled" -ForegroundColor White
    Write-Host ""
    Write-Host "To build and start production server:" -ForegroundColor Yellow
    Write-Host "  npm run build" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Environment switch complete!" -ForegroundColor Green
