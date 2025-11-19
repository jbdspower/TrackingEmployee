#!/bin/bash

# Server Diagnostic Script
# Run this to diagnose the 502 error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         SERVER DIAGNOSTIC - 502 Error Analysis              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test 1: Check PM2 Status
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 1: PM2 Status${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 status
echo ""

# Test 2: Check if port 5000 is listening
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 2: Port 5000 Status${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
PORT_CHECK=$(netstat -tulpn 2>/dev/null | grep :5000 || lsof -i :5000 2>/dev/null)
if [ -z "$PORT_CHECK" ]; then
    echo -e "${RED}❌ Nothing is listening on port 5000!${NC}"
    echo -e "${YELLOW}   This is the problem! Node.js app is not running.${NC}"
else
    echo -e "${GREEN}✅ Port 5000 is active:${NC}"
    echo "$PORT_CHECK"
fi
echo ""

# Test 3: Test local API
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 3: Local API Test${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
API_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/ping 2>/dev/null)
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$API_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API is responding!${NC}"
    echo -e "${CYAN}Response:${NC} $RESPONSE_BODY"
    echo -e "${YELLOW}   Node.js app is working. Problem is with nginx configuration.${NC}"
    echo -e "${YELLOW}   Contact Hostinger support to configure nginx.${NC}"
else
    echo -e "${RED}❌ API is not responding (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}   Node.js app is not working properly.${NC}"
fi
echo ""

# Test 4: Check build files
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 4: Build Files${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "dist/spa/index.html" ]; then
    echo -e "${GREEN}✅ Frontend build exists${NC}"
    echo -e "   $(ls -lh dist/spa/index.html)"
else
    echo -e "${RED}❌ Frontend build missing!${NC}"
    echo -e "${YELLOW}   Run: npm run build${NC}"
fi

if [ -f "dist/server/node-build.mjs" ]; then
    echo -e "${GREEN}✅ Server build exists${NC}"
    echo -e "   $(ls -lh dist/server/node-build.mjs)"
else
    echo -e "${RED}❌ Server build missing!${NC}"
    echo -e "${YELLOW}   Run: npm run build${NC}"
fi
echo ""

# Test 5: Check .env file
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 5: Environment Configuration${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo -e "${CYAN}Contents:${NC}"
    cat .env | grep -E "NODE_ENV|PORT|API_BASE_URL"
    
    if grep -q "NODE_ENV=production" .env; then
        echo -e "${GREEN}✅ NODE_ENV is production${NC}"
    else
        echo -e "${RED}❌ NODE_ENV is not production!${NC}"
    fi
else
    echo -e "${RED}❌ .env file missing!${NC}"
    echo -e "${YELLOW}   Run: cp .env.production .env${NC}"
fi
echo ""

# Test 6: Check PM2 logs
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 6: Recent PM2 Logs${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 logs trackingApp --lines 20 --nostream 2>/dev/null || echo -e "${RED}No logs available${NC}"
echo ""

# Test 7: Check Node.js version
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST 7: System Information${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Node.js:${NC} $(node --version)"
echo -e "${CYAN}NPM:${NC} $(npm --version)"
echo -e "${CYAN}PM2:${NC} $(pm2 --version)"
echo -e "${CYAN}Current Directory:${NC} $(pwd)"
echo ""

# Summary and Recommendations
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}DIAGNOSIS SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Determine the issue
if [ -z "$PORT_CHECK" ]; then
    echo -e "${RED}❌ ISSUE: Node.js application is NOT running${NC}"
    echo ""
    echo -e "${YELLOW}SOLUTION:${NC}"
    echo -e "1. Build the project:"
    echo -e "   ${CYAN}npm run build${NC}"
    echo ""
    echo -e "2. Start the application:"
    echo -e "   ${CYAN}export NODE_ENV=production${NC}"
    echo -e "   ${CYAN}pm2 start npm --name 'trackingApp' -- start${NC}"
    echo -e "   ${CYAN}pm2 save${NC}"
    echo ""
elif [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ ISSUE: Node.js application is running but not responding correctly${NC}"
    echo ""
    echo -e "${YELLOW}SOLUTION:${NC}"
    echo -e "1. Check PM2 logs for errors:"
    echo -e "   ${CYAN}pm2 logs trackingApp${NC}"
    echo ""
    echo -e "2. Restart the application:"
    echo -e "   ${CYAN}pm2 restart trackingApp${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Node.js application is working correctly!${NC}"
    echo ""
    echo -e "${YELLOW}ISSUE: Nginx is not configured to proxy to your Node.js app${NC}"
    echo ""
    echo -e "${YELLOW}SOLUTION:${NC}"
    echo -e "1. Contact Hostinger support"
    echo -e "2. Ask them to configure nginx to proxy to port 5000"
    echo -e "3. Or use Hostinger Node.js panel to set up the application"
    echo ""
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
