# Environment Configuration Guide

## Overview

This project uses a centralized configuration system that allows you to easily switch between development (localhost) and production (live server) environments.

## Configuration Files

### 1. `shared/config.ts` - Centralized Configuration
This is the main configuration file that all other files import from. It automatically detects the environment and uses the appropriate settings.

### 2. `.env` - Development Environment (Current)
Used for local development on `http://localhost:5000`

### 3. `.env.production` - Production Environment
Used for live server on `https://tracking.jbdspower.in`

### 4. `.env.example` - Template
Template file for new developers to copy and create their own `.env`

## Quick Start

### For Development (Localhost)

Your current `.env` file is already configured for development:

```env
NODE_ENV=development
API_BASE_URL=http://localhost:5000
```

Just run:
```bash
npm run dev
```

### For Production (Live Server)

**Option 1: Update .env file**
1. Open `.env` file
2. Change these lines:
   ```env
   NODE_ENV=production
   API_BASE_URL=https://tracking.jbdspower.in
   ```
3. Build and deploy:
   ```bash
   npm run build
   npm start
   ```

**Option 2: Use .env.production file**
1. Copy `.env.production` to `.env`:
   ```bash
   cp .env.production .env
   ```
2. Build and deploy:
   ```bash
   npm run build
   npm start
   ```

## How It Works

### Automatic Environment Detection

The configuration system automatically detects the environment:

**Client-Side (Browser):**
- If hostname is `localhost` → Development mode
- If hostname is anything else → Production mode

**Server-Side:**
- Uses `NODE_ENV` environment variable
- Falls back to `development` if not set

### API Base URL

The system uses `window.location.origin` in the browser, which means:
- On `http://localhost:5000` → API calls go to `http://localhost:5000/api/...`
- On `https://tracking.jbdspower.in` → API calls go to `https://tracking.jbdspower.in/api/...`

**No code changes needed!** The system automatically adapts.

## Using Configuration in Your Code

### Import the config

```typescript
import { config, getApiUrl } from '@shared/config';
```

### Access configuration values

```typescript
// Get environment
console.log(config.environment); // 'development' or 'production'
console.log(config.isDevelopment); // true or false
console.log(config.isProduction); // true or false

// Get API base URL
console.log(config.apiBaseUrl); // 'http://localhost:5000' or 'https://tracking.jbdspower.in'

// Get database config
console.log(config.database.uri);
console.log(config.database.name);

// Get external APIs
console.log(config.externalApis.userApi);
console.log(config.externalApis.customerApi);
console.log(config.externalApis.leadApi);

// Get server config
console.log(config.server.port);

// Feature flags
console.log(config.features.enableLogging);
console.log(config.features.enableDebugMode);
```

### Build full API URLs

```typescript
import { getApiUrl } from '@shared/config';

// These automatically use the correct base URL
const employeesUrl = getApiUrl('/api/employees');
const analyticsUrl = getApiUrl('/api/analytics/attendance');

console.log(employeesUrl);
// Development: http://localhost:5000/api/employees
// Production: https://tracking.jbdspower.in/api/employees
```

## Environment Variables Reference

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `API_BASE_URL` | API server URL | `http://localhost:5000` | `https://tracking.jbdspower.in` |
| `MONGODB_URI` | MongoDB connection | Your local/cloud DB | Production DB |
| `DB_NAME` | Database name | `employee-tracking` | `employee-tracking` |
| `PORT` | Server port | `5000` | `5000` or hosting provider's port |
| `EXTERNAL_USER_API` | External user API | Same for both | Same for both |
| `EXTERNAL_CUSTOMER_API` | External customer API | Same for both | Same for both |
| `EXTERNAL_LEAD_API` | External lead API | Same for both | Same for both |
| `ENABLE_LOGGING` | Enable console logs | `true` | `false` |
| `DEBUG_MODE` | Enable debug mode | `false` | `false` |

## Deployment Checklist

### Before Deploying to Production:

- [ ] Update `.env` file or use `.env.production`
- [ ] Set `NODE_ENV=production`
- [ ] Set `API_BASE_URL=https://tracking.jbdspower.in`
- [ ] Verify MongoDB connection string
- [ ] Set `ENABLE_LOGGING=false` (optional, for cleaner logs)
- [ ] Run `npm run build`
- [ ] Test the build locally: `npm start`
- [ ] Deploy to server

### After Deployment:

- [ ] Verify API endpoints work
- [ ] Check browser console for errors
- [ ] Test all features
- [ ] Monitor server logs

## Switching Between Environments

### Quick Switch to Development:
```bash
# Edit .env file
NODE_ENV=development
API_BASE_URL=http://localhost:5000
```

### Quick Switch to Production:
```bash
# Edit .env file
NODE_ENV=production
API_BASE_URL=https://tracking.jbdspower.in
```

### Or use environment-specific files:
```bash
# For development
cp .env.example .env

# For production
cp .env.production .env
```

## Example Usage in Code

### Client-Side (React Component)

```typescript
import { config } from '@shared/config';

function MyComponent() {
  useEffect(() => {
    console.log('Running in:', config.environment);
    console.log('API URL:', config.apiBaseUrl);
    
    // Fetch data - automatically uses correct URL
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => console.log(data));
  }, []);
  
  return <div>Environment: {config.environment}</div>;
}
```

### Server-Side (Express Route)

```typescript
import { config } from '@shared/config';

app.get('/api/status', (req, res) => {
  res.json({
    environment: config.environment,
    apiBaseUrl: config.apiBaseUrl,
    database: config.database.name,
    timestamp: new Date().toISOString()
  });
});
```

## Troubleshooting

### Issue: API calls fail after deployment
**Solution:** Verify `API_BASE_URL` in `.env` matches your live server URL

### Issue: Wrong environment detected
**Solution:** Check `NODE_ENV` in `.env` file

### Issue: Database connection fails
**Solution:** Verify `MONGODB_URI` is correct for your environment

### Issue: External APIs not working
**Solution:** Check `EXTERNAL_*_API` variables are set correctly

## Best Practices

1. **Never commit `.env` to git** - It's already in `.gitignore`
2. **Use `.env.example` as template** - For new developers
3. **Keep `.env.production` secure** - Contains production credentials
4. **Test locally before deploying** - Run `npm run build && npm start`
5. **Use environment variables** - Don't hardcode URLs in code
6. **Document changes** - Update this file when adding new variables

## Summary

✅ **One place to change:** Just update `.env` file
✅ **Automatic detection:** System knows if it's dev or prod
✅ **No code changes:** Import from `@shared/config`
✅ **Easy deployment:** Switch environments with one file change

**For Development:**
```env
API_BASE_URL=http://localhost:5000
```

**For Production:**
```env
API_BASE_URL=https://tracking.jbdspower.in
```

That's it! The entire application will use the correct URL automatically.
