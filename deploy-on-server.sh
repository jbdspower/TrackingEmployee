#!/bin/bash

# Deploy on Hostinger Server Script
# Run this script on your Hostinger server after pushing code

echo "=== Deploying on Hostinger Server ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check current directory
echo -e "${YELLOW}1. Checking current directory...${NC}"
pwd
echo ""

# Step 2: Check Git status
echo -e "${YELLOW}2. Checking Git status...${NC}"
git status
echo ""

# Step 3: Stash any local changes
echo -e "${YELLOW}3. Stashing local changes (if any)...${NC}"
git stash
echo -e "${GREEN}   ✅ Local changes stashed${NC}"
echo ""

# Step 4: Pull latest code
echo -e "${YELLOW}4. Pulling latest code from Git...${NC}"
BRANCH=$(git branch --show-current)
echo -e "${CYAN}   Current branch: $BRANCH${NC}"

git pull origin $BRANCH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Pull successful!${NC}"
else
    echo -e "${RED}   ❌ Pull failed!${NC}"
    exit 1
fi
echo ""

# Step 5: Check if .env exists
echo -e "${YELLOW}5. Checking .env file...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}   ✅ .env file exists${NC}"
    
    # Check if NODE_ENV is production
    if grep -q "NODE_ENV=production" .env; then
        echo -e "${GREEN}   ✅ NODE_ENV is set to production${NC}"
    else
        echo -e "${RED}   ⚠️  NODE_ENV is not set to production!${NC}"
        echo -e "${YELLOW}   Setting NODE_ENV=production...${NC}"
        sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
        echo -e "${GREEN}   ✅ NODE_ENV updated${NC}"
    fi
else
    echo -e "${RED}   ❌ .env file not found!${NC}"
    echo -e "${YELLOW}   Creating .env from .env.production...${NC}"
    cp .env.production .env
    echo -e "${GREEN}   ✅ .env created${NC}"
fi
echo ""

# Step 6: Install dependencies
echo -e "${YELLOW}6. Installing dependencies...${NC}"
npm install --production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Dependencies installed!${NC}"
else
    echo -e "${RED}   ❌ Installation failed!${NC}"
    exit 1
fi
echo ""

# Step 7: Verify build files
echo -e "${YELLOW}7. Verifying build files...${NC}"
if [ -f "dist/spa/index.html" ]; then
    echo -e "${GREEN}   ✅ Frontend build exists${NC}"
else
    echo -e "${RED}   ❌ Frontend build missing!${NC}"
    echo -e "${YELLOW}   Building project...${NC}"
    npm run build
fi

if [ -f "dist/server/node-build.mjs" ]; then
    echo -e "${GREEN}   ✅ Server build exists${NC}"
else
    echo -e "${RED}   ❌ Server build missing!${NC}"
    exit 1
fi
echo ""

# Step 8: Stop old PM2 process
echo -e "${YELLOW}8. Stopping old PM2 process...${NC}"
pm2 stop tracking-app 2>/dev/null || echo -e "${CYAN}   No existing process to stop${NC}"
pm2 delete tracking-app 2>/dev/null || echo -e "${CYAN}   No existing process to delete${NC}"
echo ""

# Step 9: Start new PM2 process
echo -e "${YELLOW}9. Starting application with PM2...${NC}"
export NODE_ENV=production
pm2 start npm --name "tracking-app" -- start

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Application started!${NC}"
else
    echo -e "${RED}   ❌ Failed to start application!${NC}"
    exit 1
fi
echo ""

# Step 10: Save PM2 configuration
echo -e "${YELLOW}10. Saving PM2 configuration...${NC}"
pm2 save
echo -e "${GREEN}   ✅ PM2 configuration saved${NC}"
echo ""

# Step 11: Show PM2 status
echo -e "${YELLOW}11. Checking application status...${NC}"
pm2 status
echo ""

# Step 12: Show logs
echo -e "${YELLOW}12. Showing recent logs...${NC}"
pm2 logs tracking-app --lines 20 --nostream
echo ""

# Success message
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Your app is now live at: ${GREEN}https://tracking.jbdspower.in${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  ${CYAN}pm2 logs tracking-app${NC}       - View logs"
echo -e "  ${CYAN}pm2 restart tracking-app${NC}    - Restart app"
echo -e "  ${CYAN}pm2 stop tracking-app${NC}       - Stop app"
echo -e "  ${CYAN}pm2 status${NC}                  - Check status"
echo ""
