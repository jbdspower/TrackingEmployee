# 🔧 Configuration System - Complete Guide

## Quick Start

### Switch to Development (Localhost)
```powershell
.\switch-environment.ps1 dev
npm run dev
```

### Switch to Production (Live Server)
```powershell
.\switch-environment.ps1 prod
npm run build
npm start
```

## Overview

This project uses a centralized configuration system that makes it easy to switch between development and production environments.

## Files Structure

```
project/
├── shared/
│   └── config.ts              # ⭐ Main configuration file
├── .env                        # Current environment config
├── .env.example               # Template for new developers
├── .env.production            # Production environment template
├── switch-environment.ps1     # 🚀 Quick environment switcher
├── ENVIRONMENT_SETUP.md       # Detailed setup guide
└── MIGRATION_TO_CONFIG.md     # Migration guide
```

## The Magic File: `shared/config.ts`

This is the **single source of truth** for all configuration. Import it anywhere:

```typescript
import { config } from '@shared/config';
```

## How to Switch Environments

### Method 1: Use the Script (Recommended) 🚀

**For Development:**
```powershell
.\switch-environment.ps1 dev
```

**For Production:**
```powershell
.\switch-environment.ps1 prod
```

The script automatically:
- ✅ Backs up your current `.env`
- ✅ Updates configuration
- ✅ Shows you what changed
- ✅ Tells you what to do next

### Method 2: Manual Edit

Open `.env` file and change:

**For Development:**
```env
NODE_ENV=development
API_BASE_URL=http://localhost:5000
```

**For Production:**
```env
NODE_ENV=production
API_BASE_URL=https://tracking.jbdspower.in
```

## What Gets Configured

| Setting | Development | Production |
|---------|-------------|------------|
| **API URL** | `http://localhost:5000` | `https://tracking.jbdspower.in` |
| **Environment** | `development` | `production` |
| **Logging** | Enabled | Disabled |
| **Debug Mode** | Optional | Disabled |
| **Port** | 5000 | 5000 |

## Using Configuration in Code

### Basic Usage

```typescript
import { config } from '@shared/config';

// Check environment
console.log(config.environment);        // 'development' or 'production'
console.log(config.isDevelopment);      // true or false
console.log(config.isProduction);       // true or false

// Get API base URL
console.log(config.apiBaseUrl);         // Auto-detects based on environment

// Database
console.log(config.database.uri);       // MongoDB connection string
console.log(config.database.name);      // Database name

// External APIs
console.log(config.externalApis.userApi);
console.log(config.externalApis.customerApi);
console.log(config.externalApis.leadApi);

// Server
console.log(config.server.port);        // Server port

// Features
console.log(config.features.enableLogging);
console.log(config.features.enableDebugMode);
```

### Advanced Usage

```typescript
import { config, getApiUrl } from '@shared/config';

// Conditional rendering based on environment
function App() {
  return (
    <div>
      {config.isDevelopment && <DevTools />}
      {config.isProduction && <Analytics />}
    </div>
  );
}

// Build full API URLs
const employeesUrl = getApiUrl('/api/employees');
// Development: http://localhost:5000/api/employees
// Production: https://tracking.jbdspower.in/api/employees

// Conditional logging
if (config.features.enableLogging) {
  console.log('Debug info:', data);
}
```

## Deployment Workflow

### Development Workflow

```bash
# 1. Switch to development
.\switch-environment.ps1 dev

# 2. Start dev server
npm run dev

# 3. Open browser
# http://localhost:5000
```

### Production Deployment

```bash
# 1. Switch to production
.\switch-environment.ps1 prod

# 2. Build the project
npm run build

# 3. Test locally (optional)
npm start

# 4. Deploy to server
# Upload dist/ folder and start the server
```

## Environment Variables Reference

### Core Settings

```env
# Environment mode
NODE_ENV=development|production

# API base URL (the main setting to change)
API_BASE_URL=http://localhost:5000|https://tracking.jbdspower.in
```

### Database Settings

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://...

# Database name
DB_NAME=employee-tracking
```

### Server Settings

```env
# Server port
PORT=5000
```

### External APIs

```env
# External API endpoints
EXTERNAL_USER_API=https://jbdspower.in/LeafNetServer/api/user
EXTERNAL_CUSTOMER_API=https://jbdspower.in/LeafNetServer/api/customer
EXTERNAL_LEAD_API=https://jbdspower.in/LeafNetServer/api/getAllLead
```

### Feature Flags

```env
# Enable/disable logging
ENABLE_LOGGING=true|false

# Enable/disable debug mode
DEBUG_MODE=true|false
```

## Common Scenarios

### Scenario 1: Local Development

```powershell
# Switch to dev
.\switch-environment.ps1 dev

# Start server
npm run dev

# Open http://localhost:5000
```

### Scenario 2: Testing Production Build Locally

```powershell
# Switch to prod
.\switch-environment.ps1 prod

# Build
npm run build

# Start
npm start

# Open http://localhost:5000 (will behave like production)
```

### Scenario 3: Deploying to Live Server

```powershell
# 1. Switch to production
.\switch-environment.ps1 prod

# 2. Build
npm run build

# 3. Upload to server
# - Upload dist/ folder
# - Upload .env file
# - Upload package.json
# - Run: npm install --production
# - Run: npm start
```

### Scenario 4: Quick Environment Check

```typescript
import { config } from '@shared/config';

console.log('Current environment:', config.environment);
console.log('API URL:', config.apiBaseUrl);
console.log('Is Development:', config.isDevelopment);
console.log('Is Production:', config.isProduction);
```

## Troubleshooting

### Issue: API calls fail after switching environment

**Solution:**
1. Verify `.env` file has correct `API_BASE_URL`
2. Restart the server
3. Clear browser cache
4. Check browser console for errors

### Issue: Wrong environment detected

**Solution:**
1. Check `NODE_ENV` in `.env` file
2. Restart the server
3. Verify `config.environment` in browser console

### Issue: Changes not taking effect

**Solution:**
1. Restart the development server
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)

### Issue: Script won't run

**Solution:**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the script
.\switch-environment.ps1 dev
```

## Best Practices

### ✅ Do's

- ✅ Use the switch script for environment changes
- ✅ Import config from `@shared/config`
- ✅ Use `config.isDevelopment` for dev-only features
- ✅ Keep `.env` file secure (it's in `.gitignore`)
- ✅ Test production build locally before deploying
- ✅ Document any new environment variables

### ❌ Don'ts

- ❌ Don't hardcode URLs in code
- ❌ Don't commit `.env` to git
- ❌ Don't use `process.env` directly (use config instead)
- ❌ Don't forget to switch environment before deploying
- ❌ Don't skip testing after environment switch

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  ENVIRONMENT SWITCHER - QUICK REFERENCE                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Switch to Development:                                  │
│    .\switch-environment.ps1 dev                         │
│    npm run dev                                           │
│                                                          │
│  Switch to Production:                                   │
│    .\switch-environment.ps1 prod                        │
│    npm run build                                         │
│    npm start                                             │
│                                                          │
│  Import Config:                                          │
│    import { config } from '@shared/config';             │
│                                                          │
│  Check Environment:                                      │
│    config.environment                                    │
│    config.isDevelopment                                  │
│    config.isProduction                                   │
│                                                          │
│  Get API URL:                                            │
│    config.apiBaseUrl                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Summary

### What You Have Now

✅ **Centralized Configuration** - One file (`shared/config.ts`) for all settings
✅ **Easy Switching** - One command to switch environments
✅ **Automatic Detection** - System knows if it's dev or prod
✅ **No Code Changes** - Existing code works automatically
✅ **Type-Safe** - Full TypeScript support

### To Switch Environments

**Development:**
```powershell
.\switch-environment.ps1 dev
```

**Production:**
```powershell
.\switch-environment.ps1 prod
```

That's it! Your entire application will use the correct URL automatically.

## Need Help?

- 📖 Read `ENVIRONMENT_SETUP.md` for detailed setup
- 🔄 Read `MIGRATION_TO_CONFIG.md` for code migration
- 🐛 Check troubleshooting section above
- 💬 Ask your team for help

---

**Made with ❤️ for easy environment management**
