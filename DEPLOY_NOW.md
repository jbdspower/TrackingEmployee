# 🚀 Deploy to Hostinger - Quick Guide

## Step-by-Step Commands

### 1️⃣ On Your Computer

```powershell
# Switch to production
.\switch-environment.ps1 prod

# Build the project
npm run build
```

✅ This creates a `dist/` folder with your production-ready app.

### 2️⃣ Upload to Hostinger

**Via FTP or File Manager, upload:**
- `dist/` folder
- `server/` folder
- `shared/` folder
- `package.json`
- `package-lock.json`
- `.env` (production version)

### 3️⃣ On Hostinger Server

**Via SSH or Terminal:**

```bash
# Navigate to your project folder
cd /home/your-username/domains/tracking.jbdspower.in

# Install dependencies
npm install --production

# Start the application
npm start
```

**Or if using PM2:**

```bash
# Start with PM2
pm2 start dist/server/index.js --name tracking-app

# Save configuration
pm2 save

# Setup auto-restart
pm2 startup
```

### 4️⃣ Configure in Hostinger Panel

**Go to Node.js section:**
1. Create New Application
2. Set Application Root: `/domains/tracking.jbdspower.in`
3. Set Startup File: `dist/server/index.js`
4. Select Node.js version: 18.x or higher
5. Click "Start"

### 5️⃣ Verify

Open in browser:
```
https://tracking.jbdspower.in
```

Test API:
```
https://tracking.jbdspower.in/api/ping
```

## That's It! 🎉

Your app is now live at: **https://tracking.jbdspower.in**

## Need Help?

- 📖 Full guide: `HOSTINGER_DEPLOYMENT.md`
- ✅ Checklist: `DEPLOY_CHECKLIST.txt`
- 🔧 Config help: `CONFIG_README.md`

## Quick Update Later

```powershell
# On your computer
.\switch-environment.ps1 prod
npm run build

# Upload dist/ folder to Hostinger

# On server
pm2 restart tracking-app
```

---

**Commands Summary:**

| Step | Command |
|------|---------|
| **Build** | `npm run build` |
| **Upload** | Use FTP/File Manager |
| **Install** | `npm install --production` |
| **Start** | `npm start` or `pm2 start dist/server/index.js` |
| **Restart** | `pm2 restart tracking-app` |
| **Logs** | `pm2 logs tracking-app` |
