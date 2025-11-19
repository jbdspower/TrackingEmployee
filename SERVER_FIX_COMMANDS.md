# 🔧 Server Fix Commands - Run These Now

## Current Situation

You're getting 502 error because the server isn't properly serving the built files.

## Quick Fix - Copy and Paste These Commands

### Step 1: Navigate to Project
```bash
cd /home/TrackingEmployee
```

### Step 2: Check if Build Files Exist
```bash
ls -la dist/spa/
ls -la dist/server/
```

**If these folders don't exist or are empty, that's the problem!**

### Step 3: Pull Latest Code (You Already Did This)
```bash
git pull origin main
```

### Step 4: Check .env File
```bash
cat .env
```

**Should show:**
```
NODE_ENV=production
API_BASE_URL=https://tracking.jbdspower.in
```

**If .env doesn't exist or is wrong:**
```bash
cp .env.production .env
nano .env
# Make sure NODE_ENV=production
# Save with Ctrl+X, then Y, then Enter
```

### Step 5: Install Dependencies
```bash
npm install --production
```

### Step 6: Build the Project (If dist/ is missing)
```bash
npm run build
```

### Step 7: Stop Old PM2 Process
```bash
pm2 stop trackingApp
pm2 delete trackingApp
```

### Step 8: Start Fresh
```bash
export NODE_ENV=production
pm2 start npm --name "trackingApp" -- start
```

### Step 9: Save PM2 Config
```bash
pm2 save
```

### Step 10: Check Status
```bash
pm2 status
```

### Step 11: View Logs
```bash
pm2 logs trackingApp --lines 50
```

### Step 12: Test API
```bash
curl http://localhost:5000/api/ping
```

**Should return:**
```json
{"message":"Hello from Express server v2!","status":"ok"}
```

## Or Use the Quick Fix Script

```bash
# Make it executable
chmod +x fix-server-now.sh

# Run it
bash fix-server-now.sh
```

## Most Likely Issue

Based on your output, the problem is probably:

1. **dist/ folder is missing or empty**
   - Solution: Run `npm run build` on server

2. **NODE_ENV is not set to production**
   - Solution: `export NODE_ENV=production`

3. **Server is trying to serve source files instead of built files**
   - Solution: Restart with correct environment

## Check These

### 1. Verify dist/spa exists and has files:
```bash
ls -la dist/spa/
# Should show index.html and assets/ folder
```

### 2. Verify dist/server exists:
```bash
ls -la dist/server/
# Should show node-build.mjs
```

### 3. Verify .env is correct:
```bash
cat .env | grep NODE_ENV
# Should show: NODE_ENV=production
```

### 4. Check PM2 logs for errors:
```bash
pm2 logs trackingApp --lines 100
```

## If Still Not Working

### Option 1: Build on Server
```bash
# Stop PM2
pm2 stop trackingApp
pm2 delete trackingApp

# Clean and rebuild
rm -rf dist/
npm run build

# Verify build
ls -la dist/spa/index.html
ls -la dist/server/node-build.mjs

# Start again
export NODE_ENV=production
pm2 start npm --name "trackingApp" -- start
pm2 save
```

### Option 2: Use Direct Node Start
```bash
# Stop PM2
pm2 stop trackingApp
pm2 delete trackingApp

# Start with node directly
export NODE_ENV=production
pm2 start dist/server/node-build.mjs --name "trackingApp"
pm2 save
```

### Option 3: Check Port
```bash
# Check if port 5000 is in use
lsof -i :5000

# If something else is using it, kill it
kill -9 <PID>

# Or change port in .env
echo "PORT=5001" >> .env
```

## Debug Information to Check

Run these and share the output if still having issues:

```bash
# 1. Check Node version
node --version

# 2. Check npm version
npm --version

# 3. Check if dist exists
ls -la dist/

# 4. Check .env
cat .env

# 5. Check PM2 status
pm2 status

# 6. Check PM2 logs
pm2 logs trackingApp --lines 50

# 7. Check if server is listening
netstat -tulpn | grep 5000

# 8. Test localhost
curl http://localhost:5000/api/ping
```

## Expected Output

When everything is working, you should see:

### PM2 Status:
```
┌────┬──────────────┬─────────┬─────┬──────────┬─────────┬─────────┐
│ id │ name         │ mode    │ ↺   │ status   │ cpu     │ memory  │
├────┼──────────────┼─────────┼─────┼──────────┼─────────┼─────────┤
│ 3  │ trackingApp  │ fork    │ 0   │ online   │ 0%      │ 50.0mb  │
└────┴──────────────┴─────────┴─────┴──────────┴─────────┴─────────┘
```

### PM2 Logs:
```
📦 Serving static files from: /home/TrackingEmployee/dist/spa
🚀 Fusion Starter server running on port 5000
```

### API Test:
```bash
curl http://localhost:5000/api/ping
# Returns: {"message":"Hello from Express server v2!","status":"ok"}
```

## Summary

**Most likely you need to:**

1. Build the project on server: `npm run build`
2. Set environment: `export NODE_ENV=production`
3. Restart PM2: `pm2 restart trackingApp`

**Quick command sequence:**
```bash
cd /home/TrackingEmployee
npm run build
export NODE_ENV=production
pm2 restart trackingApp
pm2 logs trackingApp
```

Your app should then work at: **https://tracking.jbdspower.in** 🚀
