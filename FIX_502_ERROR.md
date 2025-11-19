# 🔧 Fix 502 Bad Gateway Error

## Problem

Getting 502 Bad Gateway error and requests to `/client/App.tsx` instead of serving the built files.

## Root Cause

The server isn't properly serving static files in production mode.

## Solution Applied

Updated `server/index.ts` to serve static files when `NODE_ENV=production`.

## Steps to Fix

### 1. Rebuild the Project

```powershell
# Make sure you're in production mode
.\switch-environment.ps1 prod

# Rebuild
npm run build
```

### 2. Verify Build Output

Check that these folders exist:
```
dist/
├── spa/              # Frontend build
│   ├── index.html
│   ├── assets/
│   └── ...
└── server/           # Backend build
    └── node-build.mjs
```

### 3. Test Locally First

```bash
# Set environment
$env:NODE_ENV="production"

# Start server
npm start
```

Open `http://localhost:5000` - it should work!

### 4. Upload to Hostinger

Upload these files:
- ✅ `dist/` folder (ENTIRE folder including spa/ and server/)
- ✅ `server/` folder (source code)
- ✅ `shared/` folder
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `.env` (with `NODE_ENV=production`)

### 5. On Hostinger Server

```bash
# Navigate to your project
cd /home/your-username/domains/tracking.jbdspower.in

# Install dependencies
npm install --production

# Make sure NODE_ENV is set
export NODE_ENV=production

# Start the server
npm start
```

Or with PM2:
```bash
# Stop old process if running
pm2 stop tracking-app
pm2 delete tracking-app

# Start fresh
pm2 start npm --name "tracking-app" -- start

# Save configuration
pm2 save
```

## Verification

### Check 1: Test API Endpoint
```bash
curl https://tracking.jbdspower.in/api/ping
```

Should return:
```json
{"message":"Hello from Express server v2!","timestamp":"...","status":"ok"}
```

### Check 2: Test Homepage
```bash
curl https://tracking.jbdspower.in
```

Should return HTML (not 502 error).

### Check 3: Check Server Logs

```bash
# If using PM2
pm2 logs tracking-app

# Look for:
# "📦 Serving static files from: /path/to/dist/spa"
# "🚀 Fusion Starter server running on port 5000"
```

## Common Issues & Solutions

### Issue 1: Still getting 502

**Cause:** Server not running or crashed

**Solution:**
```bash
# Check if server is running
pm2 status

# Check logs for errors
pm2 logs tracking-app

# Restart
pm2 restart tracking-app
```

### Issue 2: dist/spa folder not found

**Cause:** Build didn't complete or files not uploaded

**Solution:**
```bash
# On local machine
npm run build

# Verify dist/spa exists
ls dist/spa

# Re-upload to Hostinger
```

### Issue 3: NODE_ENV not set

**Cause:** Environment variable not configured

**Solution:**

**Option A: In .env file**
```env
NODE_ENV=production
```

**Option B: In Hostinger Node.js panel**
Add environment variable:
- Name: `NODE_ENV`
- Value: `production`

**Option C: In PM2 ecosystem file**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'tracking-app',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

Then:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Issue 4: Port already in use

**Cause:** Another process using port 5000

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port in .env
PORT=5001
```

### Issue 5: Service Worker causing issues

**Cause:** Old service worker cached

**Solution:**
1. Open browser DevTools (F12)
2. Go to Application tab
3. Click "Service Workers"
4. Click "Unregister"
5. Clear cache
6. Hard refresh (Ctrl+Shift+R)

## Hostinger-Specific Configuration

### Using Hostinger Node.js Panel

1. **Go to:** Advanced → Node.js
2. **Application Settings:**
   - Application Root: `/domains/tracking.jbdspower.in`
   - Application URL: `https://tracking.jbdspower.in`
   - Application Startup File: `dist/server/node-build.mjs`
   - Node.js Version: 18.x or higher
   - Environment: `production`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_connection_string
   DB_NAME=employee-tracking
   ```

4. **Click "Restart"**

### File Structure on Server

Ensure this structure:
```
/home/username/domains/tracking.jbdspower.in/
├── dist/
│   ├── spa/                    # ← Frontend files MUST be here
│   │   ├── index.html
│   │   ├── assets/
│   │   └── ...
│   └── server/                 # ← Backend files
│       └── node-build.mjs
├── server/                     # ← Source code
├── shared/                     # ← Shared code
├── package.json
├── package-lock.json
├── .env                        # ← With NODE_ENV=production
└── node_modules/               # ← After npm install
```

## Debug Checklist

- [ ] `npm run build` completed successfully
- [ ] `dist/spa/index.html` exists
- [ ] `dist/server/node-build.mjs` exists
- [ ] `.env` has `NODE_ENV=production`
- [ ] All files uploaded to Hostinger
- [ ] `npm install --production` ran on server
- [ ] Server is running (check `pm2 status`)
- [ ] No errors in logs (`pm2 logs`)
- [ ] Port 5000 is not blocked
- [ ] Domain points to correct directory

## Quick Fix Commands

```bash
# Complete reset on server
pm2 stop all
pm2 delete all
cd /home/your-username/domains/tracking.jbdspower.in
rm -rf node_modules
npm install --production
export NODE_ENV=production
pm2 start npm --name "tracking-app" -- start
pm2 save
pm2 logs tracking-app
```

## Test After Fix

1. **API Test:**
   ```
   https://tracking.jbdspower.in/api/ping
   ```
   Should return JSON

2. **Homepage Test:**
   ```
   https://tracking.jbdspower.in
   ```
   Should load the app

3. **Console Test:**
   Open browser console (F12)
   Should see no errors

## Still Not Working?

### Check Server Logs

```bash
pm2 logs tracking-app --lines 100
```

Look for:
- ✅ "🚀 Fusion Starter server running on port 5000"
- ✅ "📦 Serving static files from: ..."
- ❌ Any error messages

### Check File Permissions

```bash
# Make sure files are readable
chmod -R 755 dist/
```

### Check Hostinger Status

- Is Node.js enabled?
- Is the application running in the panel?
- Are there any resource limits hit?

## Summary

The fix adds static file serving to the production server. After rebuilding and re-uploading, your app should work correctly.

**Key Points:**
1. ✅ Rebuild with `npm run build`
2. ✅ Upload entire `dist/` folder
3. ✅ Set `NODE_ENV=production`
4. ✅ Restart server with `pm2 restart`
5. ✅ Check logs for errors

Your app should now be live at: **https://tracking.jbdspower.in** 🚀
