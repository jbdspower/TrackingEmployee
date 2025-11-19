# 🚀 Hostinger Deployment Guide

## Quick Deployment Commands

### Step 1: Switch to Production Environment
```powershell
.\switch-environment.ps1 prod
```

### Step 2: Build the Project
```bash
npm run build
```

### Step 3: Upload to Hostinger
Upload these files/folders to your Hostinger server:
- `dist/` folder (entire folder)
- `package.json`
- `package-lock.json`
- `.env` (with production settings)
- `server/` folder (entire folder)
- `shared/` folder (entire folder)
- `node_modules/` (optional, can install on server)

### Step 4: On Hostinger Server
```bash
# Navigate to your project directory
cd /home/your-username/your-project

# Install dependencies (if you didn't upload node_modules)
npm install --production

# Start the server
npm start
```

## Detailed Step-by-Step Guide

### 1. Prepare Your Local Project

#### A. Switch to Production Environment
```powershell
# Run this in your project root
.\switch-environment.ps1 prod
```

This will update your `.env` file to:
```env
NODE_ENV=production
API_BASE_URL=https://tracking.jbdspower.in
```

#### B. Build the Project
```bash
npm run build
```

This creates a `dist/` folder with:
- `dist/spa/` - Your React frontend (optimized)
- `dist/server/` - Your Express backend (compiled)

### 2. Verify the Build

Test locally before uploading:
```bash
npm start
```

Open `http://localhost:5000` and verify everything works.

### 3. Upload to Hostinger

#### Option A: Using File Manager (Easy)

1. **Login to Hostinger Control Panel**
2. **Go to File Manager**
3. **Navigate to your domain folder** (e.g., `public_html` or `domains/tracking.jbdspower.in`)
4. **Upload these files/folders:**
   ```
   ✅ dist/ (entire folder)
   ✅ server/ (entire folder)
   ✅ shared/ (entire folder)
   ✅ package.json
   ✅ package-lock.json
   ✅ .env (production version)
   ```

#### Option B: Using FTP (Recommended)

1. **Get FTP credentials from Hostinger**
2. **Use FileZilla or WinSCP**
3. **Connect to your server**
4. **Upload the same files as above**

#### Option C: Using Git (Advanced)

```bash
# On your local machine
git add .
git commit -m "Production build"
git push origin main

# On Hostinger server (via SSH)
cd /home/your-username/your-project
git pull origin main
npm install --production
npm run build
```

### 4. Configure Hostinger

#### A. Setup Node.js Application

1. **Login to Hostinger Control Panel**
2. **Go to "Advanced" → "Node.js"**
3. **Create New Application:**
   - **Application Root:** `/domains/tracking.jbdspower.in` (or your path)
   - **Application URL:** `https://tracking.jbdspower.in`
   - **Application Startup File:** `dist/server/index.js`
   - **Node.js Version:** Select latest (18.x or 20.x)
   - **Environment:** `production`

4. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/
   DB_NAME=employee-tracking
   ```

5. **Click "Create"**

#### B. Start the Application

In Hostinger Node.js panel:
1. Click "Start Application"
2. Wait for status to show "Running"

### 5. Configure Domain

#### A. Point Domain to Application

1. **Go to Hostinger DNS Settings**
2. **Add/Update A Record:**
   - **Type:** A
   - **Name:** tracking (or @ for root domain)
   - **Points to:** Your server IP
   - **TTL:** 14400

#### B. Setup SSL Certificate

1. **Go to "SSL" in Hostinger**
2. **Install Free SSL Certificate**
3. **Enable "Force HTTPS"**

### 6. Verify Deployment

#### A. Check Application Status
```bash
# Via SSH
pm2 status
# or
pm2 logs
```

#### B. Test Endpoints
```bash
# Test API
curl https://tracking.jbdspower.in/api/ping

# Should return:
# {"message":"Hello from Express server v2!","timestamp":"...","status":"ok"}
```

#### C. Open in Browser
```
https://tracking.jbdspower.in
```

## Common Hostinger Configurations

### Using PM2 (Process Manager)

If Hostinger uses PM2:

```bash
# Start application
pm2 start dist/server/index.js --name "tracking-app"

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

### Using Node.js Selector

If Hostinger has Node.js Selector:

1. Select Node.js version (18.x or higher)
2. Set application root
3. Set startup file: `dist/server/index.js`
4. Click "Restart"

## Troubleshooting

### Issue: Application won't start

**Check:**
```bash
# View logs
pm2 logs

# Or check Node.js logs in Hostinger panel
```

**Common fixes:**
- Verify `NODE_ENV=production` in `.env`
- Check MongoDB connection string
- Ensure all dependencies are installed
- Verify port is not in use

### Issue: 404 errors

**Solution:**
- Ensure `dist/spa/` folder exists
- Check that Express serves static files
- Verify domain points to correct directory

### Issue: API calls fail

**Solution:**
- Check `.env` has `API_BASE_URL=https://tracking.jbdspower.in`
- Verify CORS is enabled in server
- Check SSL certificate is installed

### Issue: Database connection fails

**Solution:**
- Verify MongoDB URI in `.env`
- Check MongoDB Atlas allows connections from Hostinger IP
- Test connection string locally first

## File Structure on Server

```
/home/username/domains/tracking.jbdspower.in/
├── dist/
│   ├── spa/              # Frontend build
│   │   ├── index.html
│   │   ├── assets/
│   │   └── ...
│   └── server/           # Backend build
│       └── index.js
├── server/               # Server source (if needed)
├── shared/               # Shared code
├── package.json
├── package-lock.json
└── .env                  # Production environment
```

## Deployment Checklist

### Before Deployment
- [ ] Run `.\switch-environment.ps1 prod`
- [ ] Verify `.env` has production settings
- [ ] Run `npm run build`
- [ ] Test build locally with `npm start`
- [ ] Commit changes to git (optional)

### During Deployment
- [ ] Upload `dist/` folder
- [ ] Upload `server/` folder
- [ ] Upload `shared/` folder
- [ ] Upload `package.json` and `package-lock.json`
- [ ] Upload `.env` (production version)
- [ ] Run `npm install --production` on server
- [ ] Configure Node.js application in Hostinger
- [ ] Start the application

### After Deployment
- [ ] Test `https://tracking.jbdspower.in`
- [ ] Test API endpoints
- [ ] Check browser console for errors
- [ ] Verify database connections
- [ ] Test all features
- [ ] Monitor logs for errors

## Updating the Application

### Quick Update Process

```bash
# 1. On local machine
.\switch-environment.ps1 prod
npm run build

# 2. Upload only changed files:
#    - dist/ folder
#    - Any changed server/ files

# 3. On Hostinger (via SSH or panel)
pm2 restart tracking-app
# or
# Restart via Hostinger Node.js panel
```

### Full Update Process

```bash
# 1. Local
.\switch-environment.ps1 prod
npm run build

# 2. Upload all files

# 3. On server
npm install --production
pm2 restart tracking-app
```

## Environment Variables on Hostinger

Set these in Hostinger Node.js panel or `.env` file:

```env
NODE_ENV=production
API_BASE_URL=https://tracking.jbdspower.in
PORT=5000
MONGODB_URI=mongodb+srv://powerjbds:powerjbds@jbds.hk6xeqm.mongodb.net/
DB_NAME=employee-tracking
EXTERNAL_USER_API=https://jbdspower.in/LeafNetServer/api/user
EXTERNAL_CUSTOMER_API=https://jbdspower.in/LeafNetServer/api/customer
EXTERNAL_LEAD_API=https://jbdspower.in/LeafNetServer/api/getAllLead
ENABLE_LOGGING=false
DEBUG_MODE=false
```

## Performance Tips

### 1. Enable Compression
Already configured in your Express server.

### 2. Use CDN (Optional)
Hostinger may offer CDN - enable it for faster loading.

### 3. Monitor Resources
Check CPU and memory usage in Hostinger panel.

### 4. Setup Monitoring
Use PM2 monitoring or Hostinger's built-in monitoring.

## Support

### Hostinger Support
- Live Chat: Available 24/7
- Knowledge Base: https://support.hostinger.com
- Ticket System: Via control panel

### Application Logs
```bash
# Via SSH
pm2 logs tracking-app

# Or check in Hostinger Node.js panel
```

## Summary

### Complete Deployment Command Sequence

```powershell
# On your local machine:
.\switch-environment.ps1 prod
npm run build

# Upload to Hostinger:
# - dist/ folder
# - server/ folder
# - shared/ folder
# - package.json, package-lock.json
# - .env (production)

# On Hostinger server (via SSH):
npm install --production
pm2 start dist/server/index.js --name tracking-app
pm2 save

# Or use Hostinger Node.js panel to start
```

### Quick Commands Reference

```bash
# Build
npm run build

# Test locally
npm start

# On server - start
pm2 start dist/server/index.js --name tracking-app

# On server - restart
pm2 restart tracking-app

# On server - stop
pm2 stop tracking-app

# On server - view logs
pm2 logs tracking-app
```

---

**Your app will be live at:** `https://tracking.jbdspower.in` 🚀
