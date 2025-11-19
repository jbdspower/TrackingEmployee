# Migration Guide: Using Centralized Configuration

## Overview

This guide shows how to update existing code to use the new centralized configuration system.

## What Changed

### Before (Hardcoded URLs)
```typescript
// ❌ Old way - hardcoded
const response = await fetch('http://localhost:5000/api/employees');
```

### After (Using Config)
```typescript
// ✅ New way - uses config
import { config } from '@shared/config';
const response = await fetch('/api/employees');
// Automatically uses correct base URL
```

## Good News!

**You don't need to change most of your code!** 

The `HttpClient` already uses `window.location.origin`, which means it automatically works with the new system. Your existing code like this:

```typescript
const response = await HttpClient.get('/api/analytics/attendance');
```

Will automatically work on both:
- `http://localhost:5000/api/analytics/attendance` (development)
- `https://tracking.jbdspower.in/api/analytics/attendance` (production)

## When to Use the Config

### Use Case 1: Checking Environment

```typescript
import { config } from '@shared/config';

if (config.isDevelopment) {
  console.log('Running in development mode');
}

if (config.isProduction) {
  // Disable debug features
  console.log('Running in production mode');
}
```

### Use Case 2: Conditional Features

```typescript
import { config } from '@shared/config';

function MyComponent() {
  return (
    <div>
      {config.isDevelopment && (
        <DebugPanel />
      )}
      
      {config.features.enableLogging && (
        <LogViewer />
      )}
    </div>
  );
}
```

### Use Case 3: External API Calls

```typescript
import { config } from '@shared/config';

// Instead of hardcoding
// const API_URL = 'https://jbdspower.in/LeafNetServer/api/user';

// Use config
const response = await fetch(config.externalApis.userApi);
```

### Use Case 4: Server Configuration

```typescript
import { config } from '@shared/config';

// Database connection
mongoose.connect(config.database.uri, {
  dbName: config.database.name
});

// Server port
app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
});
```

## Examples from Your Codebase

### Example 1: Dashboard Component

**Current Code (No changes needed):**
```typescript
// client/pages/Dashboard.tsx
const response = await HttpClient.get('/api/analytics/attendance');
// ✅ This already works! HttpClient uses window.location.origin
```

**Optional Enhancement:**
```typescript
import { config } from '@shared/config';

// Add environment indicator
<div className="text-sm text-muted-foreground">
  Environment: {config.environment}
  {config.isDevelopment && ' (Development Mode)'}
</div>
```

### Example 2: Analytics Routes

**Current Code (No changes needed):**
```typescript
// server/routes/analytics.ts
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";
```

**Recommended Update:**
```typescript
import { config } from '@shared/config';

const EXTERNAL_API_URL = config.externalApis.userApi;
// Now controlled by .env file
```

### Example 3: Database Connection

**Current Code:**
```typescript
// server/config/database.ts
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
```

**Recommended Update:**
```typescript
import { config } from '@shared/config';

const uri = config.database.uri;
const dbName = config.database.name;
```

## Migration Checklist

### Phase 1: No Changes Required ✅
- [x] HttpClient already works with both environments
- [x] API routes work automatically
- [x] Frontend-backend communication works

### Phase 2: Optional Enhancements
- [ ] Replace hardcoded external API URLs with `config.externalApis.*`
- [ ] Add environment indicators in UI (development mode badge)
- [ ] Use `config.features.*` for feature flags
- [ ] Add conditional logging based on `config.features.enableLogging`

### Phase 3: Best Practices
- [ ] Import config instead of using `process.env` directly
- [ ] Use `config.isDevelopment` for dev-only features
- [ ] Use `config.isProduction` for prod-only optimizations

## Quick Reference

### Import Statement
```typescript
import { config, getApiUrl } from '@shared/config';
```

### Common Usage Patterns

```typescript
// Check environment
if (config.isDevelopment) { /* ... */ }
if (config.isProduction) { /* ... */ }

// Get API base URL
const baseUrl = config.apiBaseUrl;

// Get database config
const dbUri = config.database.uri;
const dbName = config.database.name;

// Get external APIs
const userApi = config.externalApis.userApi;
const customerApi = config.externalApis.customerApi;
const leadApi = config.externalApis.leadApi;

// Get server config
const port = config.server.port;

// Feature flags
if (config.features.enableLogging) { /* ... */ }
if (config.features.enableDebugMode) { /* ... */ }

// Build full URL (if needed)
const fullUrl = getApiUrl('/api/employees');
```

## Testing the Migration

### 1. Test Development Environment
```bash
# Ensure .env has:
# API_BASE_URL=http://localhost:5000
npm run dev
```

Open browser console and check:
```javascript
// Should show development
console.log(window.location.origin); // http://localhost:5000
```

### 2. Test Production Build Locally
```bash
# Update .env to:
# API_BASE_URL=https://tracking.jbdspower.in
npm run build
npm start
```

### 3. Verify API Calls
Open Network tab in browser DevTools and verify:
- Development: Calls go to `http://localhost:5000/api/...`
- Production: Calls go to `https://tracking.jbdspower.in/api/...`

## Summary

### What You Need to Do

**Minimum (Already Done):**
✅ Nothing! Your code already works with the new system.

**Recommended:**
1. Update `.env` file when deploying to production
2. Optionally replace hardcoded URLs with config imports

**To Deploy:**
1. Edit `.env` file:
   ```env
   NODE_ENV=production
   API_BASE_URL=https://tracking.jbdspower.in
   ```
2. Build: `npm run build`
3. Deploy: `npm start`

That's it! The centralized configuration is now ready to use.
