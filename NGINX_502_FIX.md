# 🔧 Fix 502 Bad Gateway - Nginx Can't Connect to Node.js

## The Problem

Nginx is running but can't connect to your Node.js application. This means:
- ❌ Node.js app is not running
- ❌ Node.js app crashed
- ❌ Wrong port configuration
- ❌ Nginx not configured correctly

## Quick Diagnosis - Run These Commands

```bash
# 1. Check if Node.js app is running
pm2 status

# 2. Check if anything is listening on port 5000
netstat -tulpn | grep 5000
# or
lsof -i :5000

# 3. Check PM2 logs for errors
pm2 logs trackingApp --lines 100

# 4. Check if dist/ folder exists
ls -la dist/spa/
ls -la dist/server/
```

## Solution Steps

### Step 1: Check PM2 Status

```bash
pm2 status
```

**If trackingApp shows "errored" or "stopped":**
```bash
# View the error
pm2 logs trackingApp --lines 50

# Common errors and fixes below
```

### Step 2: Common Error Fixes

#### Error: "Cannot find module 'dist/server/node-build.mjs'"

**Fix:**
```bash
cd /home/TrackingEmployee
npm run build
pm2 restart trackingApp
```

#### Error: "EADDRINUSE: address already in use :::5000"

**Fix:**
```bash
# Find what's using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Or change port
echo "PORT=5001" >> .env
pm2 restart trackingApp
```

#### Error: "Cannot find module 'express'"

**Fix:**
```bash
npm install --production
pm2 restart trackingApp
```

### Step 3: Complete Restart

```bash
# Stop everything
pm2 stop all
pm2 delete all

# Navigate to project
cd /home/TrackingEmployee

# Ensure .env exists
if [ ! -f .env ]; then
    cp .env.production .env
fi

# Set NODE_ENV
export NODE_ENV=production

# Build if needed
if [ ! -d "dist/spa" ]; then
    npm run build
fi

# Install dependencies
npm install --production

# Start fresh
pm2 start npm --name "trackingApp" -- start

# Save
pm2 save

# Check status
pm2 status

# View logs
pm2 logs trackingApp
```

### Step 4: Check Nginx Configuration

```bash
# Check nginx config
cat /etc/nginx/sites-available/tracking.jbdspower.in

# Or check default
cat /etc/nginx/sites-available/default
```

**Nginx should have something like:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tracking.jbdspower.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**If nginx config is wrong or missing:**
```bash
# Contact Hostinger support to configure nginx
# Or use Hostinger control panel to set up Node.js app
```

### Step 5: Verify Application is Running

```bash
# Test locally on server
curl http://localhost:5000/api/ping

# Should return JSON, not HTML error
```

**If this works but website doesn't:**
- Problem is with nginx configuration
- Contact Hostinger support

**If this doesn't work:**
- Problem is with Node.js app
- Check PM2 logs

## Hostinger-Specific Configuration

### Using Hostinger Node.js Panel

1. **Login to Hostinger Control Panel**
2. **Go to: Advanced → Node.js**
3. **Create/Edit Application:**
   - **Application Root:** `/home/TrackingEmployee`
   - **Application URL:** `https://tracking.jbdspower.in`
   - **Application Startup File:** `dist/server/node-build.mjs`
   - **Node.js Version:** 18.x or 20.x
   - **Environment:** `production`

4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_connection_string
   DB_NAME=employee-tracking
   ```

5. **Click "Restart"**

### Alternative: Use Hostinger's Built-in PM2

Hostinger might manage PM2 differently. Check:

```bash
# List all PM2 processes
pm2 list

# Check if there's a different process name
pm2 status
```

## Debug Checklist

Run these commands and check the output:

```bash
echo "=== 1. PM2 Status ==="
pm2 status

echo ""
echo "=== 2. PM2 Logs ==="
pm2 logs trackingApp --lines 30 --nostream

echo ""
echo "=== 3. Port Check ==="
netstat -tulpn | grep 5000

echo ""
echo "=== 4. Dist Folder ==="
ls -la dist/

echo ""
echo "=== 5. Environment ==="
cat .env

echo ""
echo "=== 6. Node Version ==="
node --version

echo ""
echo "=== 7. NPM Version ==="
npm --version

echo ""
echo "=== 8. Local Test ==="
curl -I http://localhost:5000/api/ping
```

## Most Common Solutions

### Solution 1: App Not Running

```bash
cd /home/TrackingEmployee
pm2 stop all
pm2 delete all
export NODE_ENV=production
pm2 start npm --name "trackingApp" -- start
pm2 save
```

### Solution 2: Build Missing

```bash
cd /home/TrackingEmployee
npm run build
pm2 restart trackingApp
```

### Solution 3: Wrong Port

```bash
# Check what port app is using
pm2 logs trackingApp | grep "port"

# Make sure nginx is proxying to correct port
# Default should be 5000
```

### Solution 4: Permissions Issue

```bash
# Fix permissions
cd /home/TrackingEmployee
chmod -R 755 dist/
chown -R $USER:$USER dist/
```

## Contact Hostinger Support

If none of these work, you may need Hostinger support to:

1. **Configure nginx** to proxy to your Node.js app
2. **Check firewall** settings
3. **Verify Node.js** is enabled for your account
4. **Check resource limits** (CPU, memory)

**What to tell them:**
> "I have a Node.js application running on port 5000 (verified with `curl http://localhost:5000/api/ping`), but nginx is returning 502 Bad Gateway. Please configure nginx to proxy requests to my Node.js application at port 5000."

## Quick Test Script

Save this as `test-server.sh`:

```bash
#!/bin/bash

echo "=== Server Diagnostic Test ==="
echo ""

# Test 1: PM2 Status
echo "1. PM2 Status:"
pm2 status
echo ""

# Test 2: Port Check
echo "2. Port 5000 Status:"
netstat -tulpn | grep 5000 || echo "Nothing listening on port 5000!"
echo ""

# Test 3: Local API Test
echo "3. Local API Test:"
curl -s http://localhost:5000/api/ping || echo "API not responding!"
echo ""

# Test 4: Dist Files
echo "4. Build Files:"
if [ -f "dist/spa/index.html" ]; then
    echo "✅ Frontend build exists"
else
    echo "❌ Frontend build missing!"
fi

if [ -f "dist/server/node-build.mjs" ]; then
    echo "✅ Server build exists"
else
    echo "❌ Server build missing!"
fi
echo ""

# Test 5: Environment
echo "5. Environment:"
cat .env | grep -E "NODE_ENV|PORT" || echo "No .env file!"
echo ""

# Test 6: Recent Logs
echo "6. Recent PM2 Logs:"
pm2 logs trackingApp --lines 10 --nostream
echo ""
```

Run it:
```bash
chmod +x test-server.sh
bash test-server.sh
```

## Summary

**The 502 error means nginx can't connect to your Node.js app.**

**Most likely causes:**
1. ❌ Node.js app is not running → Start it with PM2
2. ❌ App crashed → Check PM2 logs
3. ❌ Wrong port → Verify port 5000
4. ❌ Nginx misconfigured → Contact Hostinger

**Quick fix to try:**
```bash
cd /home/TrackingEmployee
pm2 stop all
pm2 delete all
npm run build
export NODE_ENV=production
pm2 start npm --name "trackingApp" -- start
pm2 save
pm2 logs trackingApp
```

**Then test:**
```bash
curl http://localhost:5000/api/ping
```

If this returns JSON, the app is working and the issue is nginx configuration (contact Hostinger).

If this returns an error, check PM2 logs for the actual error.
