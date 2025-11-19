# ⚡ Quick Deployment Reference

## 🚀 Deploy in 2 Commands

### On Your Computer
```powershell
.\deploy-via-git.ps1
```

### On Hostinger Server
```bash
bash deploy-on-server.sh
```

**That's it!** Your app is live! 🎉

---

## 📋 What Each Script Does

### Local Script (`deploy-via-git.ps1`)
1. ✅ Switches to production environment
2. ✅ Cleans old build
3. ✅ Builds the project
4. ✅ Verifies build output
5. ✅ Commits to Git
6. ✅ Pushes to remote

### Server Script (`deploy-on-server.sh`)
1. ✅ Pulls latest code
2. ✅ Installs dependencies
3. ✅ Verifies build files
4. ✅ Restarts application
5. ✅ Shows status

---

## 🔧 Manual Commands (If Needed)

### On Your Computer
```powershell
# Build
.\switch-environment.ps1 prod
npm run build

# Push to Git
git add .
git commit -m "Production build"
git push origin main
```

### On Hostinger Server
```bash
# Pull and restart
cd /home/your-username/domains/tracking.jbdspower.in
git pull origin main
npm install --production
pm2 restart tracking-app
```

---

## ✅ Verify Deployment

### Test API
```
https://tracking.jbdspower.in/api/ping
```

### Test Homepage
```
https://tracking.jbdspower.in
```

### Check Logs
```bash
pm2 logs tracking-app
```

---

## 🆘 Quick Fixes

### If build fails:
```powershell
npm install
npm run build
```

### If push fails:
```powershell
git pull origin main
git push origin main
```

### If server fails:
```bash
pm2 restart tracking-app
pm2 logs tracking-app
```

---

## 📚 Full Documentation

- **Complete Guide:** `GIT_DEPLOYMENT_GUIDE.md`
- **Hostinger Setup:** `HOSTINGER_DEPLOYMENT.md`
- **502 Error Fix:** `FIX_502_ERROR.md`

---

**Live URL:** https://tracking.jbdspower.in 🚀
