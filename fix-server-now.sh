#!/bin/bash

# Quick Fix Script for Hostinger Server
# Run this on your server to fix the 502 error

echo "=== Quick Fix for 502 Error ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Step 1: Check current directory
echo -e "${YELLOW}1. Current directory:${NC}"
pwd
echo ""

# Step 2: Check if dist folder exists
echo -e "${YELLOW}2. Checking build files...${NC}"
if [ -d "dist/spa" ]; then
    echo -e "${GREEN}   ✅ dist/spa exists${NC}"
    ls -la dist/spa/ | head -5
else
    echo -e "${RED}   ❌ dist/spa NOT found!${NC}"
    echo -e "${YELLOW}   This is the problem! Building now...${NC}"
    npm run build
fi
echo ""

if [ -f "dist/server/node-build.mjs" ]; then
    echo -e "${GREEN}   ✅ dist/server/node-build.mjs exists${NC}"
else
    echo -e "${RED}   ❌ dist/server/node-build.mjs NOT found!${NC}"
    echo -e "${YELLOW}   Building now...${NC}"
    npm run build
fi
echo ""

# Step 3: Check .env file
echo -e "${YELLOW}3. Checking .env file...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}   ✅ .env exists${NC}"
    echo -e "${CYAN}   Contents:${NC}"
    cat .env | grep -E "NODE_ENV|API_BASE_URL|PORT"
else
    echo -e "${RED}   ❌ .env NOT found!${NC}"
    echo -e "${YELLOW}   Creating from .env.production...${NC}"
    cp .env.production .env
fi
echo ""

# Step 4: Ensure NODE_ENV is production
echo -e "${YELLOW}4. Setting NODE_ENV=production...${NC}"
export NODE_ENV=production
echo -e "${GREEN}   ✅ NODE_ENV set to production${NC}"
echo ""

# Step 5: Stop all PM2 processes for this app
echo -e "${YELLOW}5. Stopping old PM2 processes...${NC}"
pm2 stop trackingApp 2>/dev/null
pm2 delete trackingApp 2>/dev/null
echo -e "${GREEN}   ✅ Old processes stopped${NC}"
echo ""

# Step 6: Start fresh
echo -e "${YELLOW}6. Starting application...${NC}"
pm2 start npm --name "trackingApp" -- start

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Application started!${NC}"
else
    echo -e "${RED}   ❌ Failed to start!${NC}"
    echo -e "${YELLOW}   Trying alternative method...${NC}"
    pm2 start dist/server/node-build.mjs --name "trackingApp"
fi
echo ""

# Step 7: Save PM2 config
echo -e "${YELLOW}7. Saving PM2 configuration...${NC}"
pm2 save
echo ""

# Step 8: Check status
echo -e "${YELLOW}8. Checking status...${NC}"
pm2 status
echo ""

# Step 9: Show logs
echo -e "${YELLOW}9. Recent logs:${NC}"
pm2 logs trackingApp --lines 30 --nostream
echo ""

# Step 10: Test API
echo -e "${YELLOW}10. Testing API...${NC}"
sleep 2
curl -s http://localhost:5000/api/ping | head -20
echo ""
echo ""

# Final status
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Fix completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Test your app:${NC}"
echo -e "  ${GREEN}https://tracking.jbdspower.in${NC}"
echo ""
echo -e "${YELLOW}If still not working, check logs:${NC}"
echo -e "  ${CYAN}pm2 logs trackingApp${NC}"
echo ""
