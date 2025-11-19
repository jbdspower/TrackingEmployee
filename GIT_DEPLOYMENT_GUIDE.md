# 🚀 Git Deployment Guide - Complete Workflow

## Overview

This guide shows you how to deploy your application to Hostinger using Git. This is the **recommended method** as it's faster and more reliable than manual file uploads.

## Prerequisites

### On Your Local Machine
- ✅ Git installed
- ✅ Project connected to Git repository
- ✅ All changes committed

### On Hostinger Server
- ✅ SSH access enabled
- ✅ Git installed
- ✅ Repository cloned
- ✅ PM2 installed

## Quick Deployment (Use This!)

### On Your Computer

```powershell
# Run the deployment script
.\deploy-via-git.ps1
```

This will:
1. ✅ Switch to production environment
2. ✅ Clean old build
3. ✅ Build the project
4. ✅ Verify build output
5. ✅ Add files to Git
6. ✅ Commit changes
7. ✅ Push to remote repository

### On Hostinger Server

```bash
# SSH into your server
ssh your-username@your-server-ip

# Navigate to project
cd /home/your-username/domains/tracking.jbdspower.in

# Run deployment script
bash deploy-on-server.sh
```

This will:
1. ✅ Pull latest code
2. ✅ Install dependencies
3. ✅ Verify build files
4. ✅ Restart application
5. ✅ Show status and logs

## Manual Deployment Steps

### Part 1: On Your Computer

#### Step 1: Switch to Production
```powershell
.\switch-environment.ps1 prod
```

#### Step 2: Build the Project
```powershell
npm run build
```

#### Step 3: Verify Build
```powershell
# Check these files exist:
ls dist/spa/index.html
ls dist/server/node-build.mjs
```

#### Step 4: Git Add
```powershell
git add .
```

#### Step 5: Git Commit
```powershell
git commit -m "Production build - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
```

#### Step 6: Git Push
```powershell
git push origin main
# or your branch name
```

### Part 2: On Hostinger Server

#### Step 1: SSH into Server
```bash
ssh your-username@your-server-ip
```

#### Step 2: Navigate to Project
```bash
cd /home/your-username/domains/tracking.jbdspower.in
```

#### Step 3: Pull Latest Code
```bash
git pull origin main
# or your branch name
```

#### Step 4: Install Dependencies
```bash
npm install --production
```

#### Step 5: Verify Environment
```bash
# Check .env file
cat .env | grep NODE_ENV
# Should show: NODE_ENV=production
```

#### Step 6: Restart Application
```bash
# Stop old process
pm2 stop tracking-app
pm2 delete tracking-app

# Start new process
pm2 start npm --name "tracking-app" -- start

# Save configuration
pm2 save
```

#### Step 7: Verify Deployment
```bash
# Check status
pm2 status

# View logs
pm2 logs tracking-app --lines 50
```

## First-Time Setup on Hostinger

If this is your first deployment via Git:

### Step 1: Install Git (if not installed)
```bash
# Check if Git is installed
git --version

# If not installed, contact Hostinger support
```

### Step 2: Clone Repository
```bash
# Navigate to your domain folder
cd /home/your-username/domains

# Clone your repository
git clone https://github.com/your-username/your-repo.git tracking.jbdspower.in

# Navigate into project
cd tracking.jbdspower.in
```

### Step 3: Setup Environment
```bash
# Copy production environment
cp .env.production .env

# Or create .env manually
nano .env
```

Add:
```env
NODE_ENV=production
API_BASE_URL=https://tracking.jbdspower.in
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=employee-tracking
```

### Step 4: Install Dependencies
```bash
npm install --production
```

### Step 5: Install PM2 (if not installed)
```bash
npm install -g pm2
```

### Step 6: Start Application
```bash
pm2 start npm --name "tracking-app" -- start
pm2 save
pm2 startup
```

## .gitignore Configuration

Make sure your `.gitignore` includes:

```gitignore
# Dependencies
node_modules/

# Environment files (keep .env.example and .env.production)
.env

# Build output (we commit dist/ for easier deployment)
# Uncomment if you want to build on server instead
# dist/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Temporary files
*.tmp
*.temp
```

## Important Notes

### About dist/ Folder

**Option 1: Commit dist/ (Recommended for Hostinger)**
- ✅ Faster deployment
- ✅ No build needed on server
- ✅ Consistent builds
- ❌ Larger repository size

**Option 2: Build on Server**
- ✅ Smaller repository
- ❌ Slower deployment
- ❌ Requires build tools on server
- ❌ May fail if server resources are limited

**For Hostinger, we recommend Option 1** (commit dist/).

### About .env File

**Never commit `.env` with sensitive data!**

Instead:
- ✅ Commit `.env.example` (template)
- ✅ Commit `.env.production` (template)
- ❌ Don't commit `.env` (actual secrets)

On server, create `.env` manually or copy from `.env.production`.

## Troubleshooting

### Issue: Git push rejected

**Solution:**
```bash
# Pull first
git pull origin main

# Resolve conflicts if any
# Then push again
git push origin main
```

### Issue: Build files not found on server

**Solution:**
```bash
# On server, build manually
npm run build
```

### Issue: PM2 not found

**Solution:**
```bash
# Install PM2 globally
npm install -g pm2
```

### Issue: Permission denied

**Solution:**
```bash
# Fix permissions
chmod +x deploy-on-server.sh

# Or run with bash
bash deploy-on-server.sh
```

### Issue: Port already in use

**Solution:**
```bash
# Find process using port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port in .env
```

## Deployment Checklist

### Before Pushing
- [ ] Code tested locally
- [ ] Production environment set
- [ ] Build completed successfully
- [ ] Build files verified
- [ ] .env.production updated
- [ ] All changes committed

### After Pushing
- [ ] SSH into server
- [ ] Navigate to project directory
- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Verify .env file
- [ ] Restart application
- [ ] Check PM2 status
- [ ] View logs for errors
- [ ] Test live URL

## Quick Commands Reference

### Local Machine

| Action | Command |
|--------|---------|
| **Full Deploy** | `.\deploy-via-git.ps1` |
| **Build** | `npm run build` |
| **Git Add** | `git add .` |
| **Git Commit** | `git commit -m "message"` |
| **Git Push** | `git push origin main` |

### Hostinger Server

| Action | Command |
|--------|---------|
| **Full Deploy** | `bash deploy-on-server.sh` |
| **Pull Code** | `git pull origin main` |
| **Install Deps** | `npm install --production` |
| **Restart App** | `pm2 restart tracking-app` |
| **View Logs** | `pm2 logs tracking-app` |
| **Check Status** | `pm2 status` |

## Automated Deployment (Advanced)

### Using GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/your-username/domains/tracking.jbdspower.in
            git pull origin main
            npm install --production
            pm2 restart tracking-app
```

## Summary

### Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  LOCAL MACHINE                                              │
├─────────────────────────────────────────────────────────────┤
│  1. .\deploy-via-git.ps1                                    │
│     - Builds project                                         │
│     - Commits changes                                        │
│     - Pushes to Git                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  HOSTINGER SERVER                                           │
├─────────────────────────────────────────────────────────────┤
│  2. bash deploy-on-server.sh                                │
│     - Pulls latest code                                      │
│     - Installs dependencies                                  │
│     - Restarts application                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LIVE                                                        │
├─────────────────────────────────────────────────────────────┤
│  https://tracking.jbdspower.in                              │
└─────────────────────────────────────────────────────────────┘
```

### Time Comparison

| Method | Time | Complexity |
|--------|------|------------|
| **Git Deploy** | ~2 minutes | Easy |
| **Manual Upload** | ~10 minutes | Medium |
| **FTP Upload** | ~15 minutes | Hard |

**Git deployment is the fastest and most reliable method!** 🚀

## Support

If you encounter issues:
1. Check the logs: `pm2 logs tracking-app`
2. Verify build files exist
3. Check .env configuration
4. Ensure PM2 is running
5. Contact Hostinger support if needed

---

**Your app will be live at:** `https://tracking.jbdspower.in` 🎉
