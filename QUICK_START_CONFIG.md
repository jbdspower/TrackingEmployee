# ⚡ Quick Start - Environment Configuration

## TL;DR

### For Development (Localhost)
```powershell
.\switch-environment.ps1 dev
npm run dev
```
✅ Done! App runs on `http://localhost:5000`

### For Production (Live Server)
```powershell
.\switch-environment.ps1 prod
npm run build
npm start
```
✅ Done! App runs on `https://tracking.jbdspower.in`

## What Just Happened?

You now have a **centralized configuration system** that lets you switch between development and production with **one command**.

## The Files

1. **`shared/config.ts`** - Main configuration (import this in your code)
2. **`.env`** - Current environment settings
3. **`switch-environment.ps1`** - Script to switch environments

## How to Use

### In Your Code

```typescript
// Import the config
import { config } from '@shared/config';

// Use it
console.log(config.apiBaseUrl);        // Auto-detects: localhost or live server
console.log(config.isDevelopment);     // true or false
console.log(config.isProduction);      // true or false
```

### Existing Code Still Works!

Your current code like this:
```typescript
const response = await HttpClient.get('/api/analytics/attendance');
```

**Already works!** It automatically uses:
- `http://localhost:5000/api/analytics/attendance` in development
- `https://tracking.jbdspower.in/api/analytics/attendance` in production

## When to Switch

### Before Local Development
```powershell
.\switch-environment.ps1 dev
```

### Before Deploying to Live Server
```powershell
.\switch-environment.ps1 prod
```

## That's It!

No need to change URLs in multiple files. Just run the script and you're done.

## Need More Info?

- 📖 Full guide: `CONFIG_README.md`
- 🔧 Setup details: `ENVIRONMENT_SETUP.md`
- 🔄 Code migration: `MIGRATION_TO_CONFIG.md`

---

**Summary:** One command switches your entire app between localhost and live server. 🚀
