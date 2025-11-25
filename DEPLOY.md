# Deployment Instructions

## Fixed Issue
The ES module error `require is not defined in ES module scope` has been fixed by:
- Replacing `require('path')` with proper ES module imports
- Adding ES module equivalents for `__dirname` and `__filename`

## Deploy to Production Server

### 1. Upload the new build to your server
```bash
# From your local machine, upload the dist folder
scp -r dist root@srv568292:/home/TrackingEmployee/
```

### 2. SSH into your server
```bash
ssh root@srv568292
cd /home/TrackingEmployee
```

### 3. Restart PM2
```bash
pm2 restart tracking-app
```

### 4. Verify the deployment
```bash
# Check logs for successful startup
pm2 logs tracking-app --lines 20

# You should see:
# 🚀 Fusion Starter server running on port 5000
# ✅ Database: Successfully connected to MongoDB
```

### Alternative: Full redeploy
If you want to upload everything:
```bash
# From local machine
scp -r dist package.json .env root@srv568292:/home/TrackingEmployee/

# On server
cd /home/TrackingEmployee
pm2 restart tracking-app
```

## Verify Fix
The error should no longer appear. The server will start successfully with ES modules.
