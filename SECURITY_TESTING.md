# Security Testing Guide

## Quick Test Scenarios

### Scenario 1: Regular Employee Login
**Expected Behavior**: Redirected to their tracking page, no dashboard access

```
1. Login as regular employee (any ID except 67daa55d9c4abb36045d5bfe)
2. Browser automatically opens: https://tracking.jbdspower.in/
3. ✅ PASS: Immediately redirected to https://tracking.jbdspower.in/tracking/{your-id}
4. ✅ PASS: No "Back to Dashboard" button visible
5. ✅ PASS: Can see your own tracking data
```

### Scenario 2: Super Admin Login
**Expected Behavior**: Full access to dashboard and all tracking pages

```
1. Login as super admin (ID: 67daa55d9c4abb36045d5bfe)
2. Browser opens: https://tracking.jbdspower.in/
3. ✅ PASS: Dashboard loads with all employees
4. Click any employee's tracking
5. ✅ PASS: Can view their tracking page
6. ✅ PASS: "Back to Dashboard" button is visible
7. Click "Back to Dashboard"
8. ✅ PASS: Returns to dashboard
```

### Scenario 3: Unauthorized Access Attempt
**Expected Behavior**: Blocked and redirected

```
1. Login as Employee A (ID: employee-a-123)
2. Manually type in URL: https://tracking.jbdspower.in/tracking/employee-b-456
3. ✅ PASS: Toast message appears: "You can only access your own tracking page"
4. ✅ PASS: Automatically redirected to https://tracking.jbdspower.in/tracking/employee-a-123
```

### Scenario 4: No Employee ID in URL
**Expected Behavior**: Error message

```
1. Login as any user
2. Manually type: https://tracking.jbdspower.in/tracking/
3. ✅ PASS: Toast message: "Please access the tracking page with a valid employee ID"
4. ✅ PASS: Page shows error, no data loads
```

## Visual Test Checklist

### For Regular Employees
- [ ] Root URL redirects to `/tracking/{id}`
- [ ] Can see own tracking data
- [ ] Cannot see "Back to Dashboard" button
- [ ] Cannot access other employees' pages
- [ ] Cannot access `/dashboard` route
- [ ] Error messages are clear and helpful

### For Super Admin (67daa55d9c4abb36045d5bfe)
- [ ] Can access root URL `/`
- [ ] Dashboard shows all employees
- [ ] Can click any employee to view tracking
- [ ] "Back to Dashboard" button is visible
- [ ] Can navigate back to dashboard
- [ ] Can access `/dashboard` route

## Browser Console Tests

### Test 1: Check Current User
```javascript
// Open browser console (F12)
const user = JSON.parse(localStorage.getItem("user"));
console.log("Current User:", user);
console.log("User ID:", user._id);
console.log("Is Super Admin:", user._id === "67daa55d9c4abb36045d5bfe");
```

**Expected Output**:
```
Current User: {_id: "...", name: "...", email: "..."}
User ID: employee-123
Is Super Admin: false  (or true if super admin)
```

### Test 2: Simulate Unauthorized Access
```javascript
// Try to access another employee's page
window.location.href = "/tracking/another-employee-id";
// Should redirect back to your own page
```

### Test 3: Check Back Button Visibility
```javascript
// On tracking page, check if back button exists
const backButton = document.querySelector('a[href="/"]');
console.log("Back button exists:", !!backButton);
// Should be true only for super admin
```

## API Testing (Optional)

### Test Employee Data Access
```bash
# Get your own data (should work)
curl http://localhost:5000/api/employees/YOUR_ID

# Try to get another employee's data
curl http://localhost:5000/api/employees/ANOTHER_ID
# Note: API doesn't have auth yet, this is client-side only
```

## Security Verification

### ✅ What Should Work

| Action | Regular Employee | Super Admin |
|--------|-----------------|-------------|
| Access `/` | ❌ Redirected | ✅ Dashboard |
| Access `/tracking/{own-id}` | ✅ Works | ✅ Works |
| Access `/tracking/{other-id}` | ❌ Redirected | ✅ Works |
| See "Back" button | ❌ Hidden | ✅ Visible |
| Access `/dashboard` | ❌ Redirected | ✅ Works |

### ❌ What Should NOT Work

1. **Regular employee accessing root**
   - URL: `https://tracking.jbdspower.in/`
   - Result: Redirected to `/tracking/{their-id}`

2. **Regular employee accessing other's tracking**
   - URL: `https://tracking.jbdspower.in/tracking/other-id`
   - Result: Redirected to `/tracking/{their-id}`

3. **Anyone accessing tracking without ID**
   - URL: `https://tracking.jbdspower.in/tracking/`
   - Result: Error message

## Common Test Failures

### Failure 1: Redirect Loop
**Symptom**: Page keeps redirecting
**Cause**: localStorage user data is corrupted
**Fix**: 
```javascript
localStorage.clear();
// Then re-login
```

### Failure 2: Back Button Visible for Regular User
**Symptom**: Regular employee sees "Back to Dashboard"
**Cause**: User ID check failing
**Fix**: Verify user ID in localStorage matches expected format

### Failure 3: Can Access Other's Page
**Symptom**: Employee can view another employee's tracking
**Cause**: Security check not working
**Fix**: Check browser console for errors, verify code is deployed

## Automated Test Script

```javascript
// Run this in browser console to test security
async function testSecurity() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = user._id === "67daa55d9c4abb36045d5bfe";
  
  console.log("=== Security Test Results ===");
  console.log("User ID:", user._id);
  console.log("Is Super Admin:", isSuperAdmin);
  
  // Test 1: Check current page
  const currentPath = window.location.pathname;
  console.log("Current Path:", currentPath);
  
  if (currentPath === "/" && !isSuperAdmin) {
    console.error("❌ FAIL: Regular user on root page");
  } else if (currentPath === "/" && isSuperAdmin) {
    console.log("✅ PASS: Super admin on root page");
  }
  
  // Test 2: Check back button
  const backButton = document.querySelector('a[href="/"]');
  const hasBackButton = !!backButton;
  
  if (hasBackButton && !isSuperAdmin) {
    console.error("❌ FAIL: Regular user sees back button");
  } else if (!hasBackButton && isSuperAdmin) {
    console.error("❌ FAIL: Super admin doesn't see back button");
  } else {
    console.log("✅ PASS: Back button visibility correct");
  }
  
  // Test 3: Check URL employee ID matches user
  const urlMatch = currentPath.match(/\/tracking\/(.+)/);
  if (urlMatch) {
    const urlEmployeeId = urlMatch[1];
    if (urlEmployeeId !== user._id && !isSuperAdmin) {
      console.error("❌ FAIL: User accessing wrong tracking page");
    } else {
      console.log("✅ PASS: Tracking page access correct");
    }
  }
  
  console.log("=== Test Complete ===");
}

// Run the test
testSecurity();
```

## Production Testing

### Before Deployment
- [ ] Test on local environment
- [ ] Test with multiple user accounts
- [ ] Test all redirect scenarios
- [ ] Verify error messages
- [ ] Check browser console for errors

### After Deployment
- [ ] Test with real user accounts
- [ ] Verify super admin access
- [ ] Verify regular employee restrictions
- [ ] Monitor for security issues
- [ ] Check user feedback

## Rollback Plan

If security issues are found:

1. **Immediate**: Revert to previous version
```bash
git revert HEAD
npm run build
npm run start
```

2. **Temporary Fix**: Disable security checks
```typescript
// In Tracking.tsx, comment out security checks
// const isSuperAdmin = ...
// if (!isSuperAdmin && ...) { ... }
```

3. **Long-term**: Fix issues and redeploy

## Success Criteria

✅ All test scenarios pass
✅ No console errors
✅ Clear user feedback
✅ No redirect loops
✅ Super admin has full access
✅ Regular employees restricted properly

## Support Contacts

- **Security Issues**: Report immediately
- **User Access Problems**: Check localStorage
- **Redirect Issues**: Clear cache and cookies
- **General Questions**: See SECURITY_IMPLEMENTATION.md
