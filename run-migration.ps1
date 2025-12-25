# PowerShell script to run the meeting status migration

Write-Host "🔄 Running Meeting Status Migration..." -ForegroundColor Yellow

# Check if Node.js is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Set environment variables if .env file exists
if (Test-Path ".env") {
    Write-Host "📄 Loading environment variables from .env file..." -ForegroundColor Blue
    Get-Content .env | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Host "⚠️ No .env file found, using default MongoDB URI" -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("MONGODB_URI", "mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/employee-tracking", "Process")
}

# Run the migration script
try {
    Write-Host "🚀 Starting migration..." -ForegroundColor Green
    node server/scripts/migrate-meeting-status.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Migration process finished!" -ForegroundColor Cyan