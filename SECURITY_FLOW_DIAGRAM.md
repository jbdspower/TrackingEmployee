# Security Flow Diagram

## Visual Flow Chart

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACCESSES WEBSITE                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    https://tracking.jbdspower.in/
                              ↓
                    ┌─────────────────┐
                    │ Check localStorage│
                    │ for user data    │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ User ID exists? │
                    └─────────────────┘
                         ↙         ↘
                      YES           NO
                       ↓             ↓
            ┌──────────────┐   ┌──────────────┐
            │ Is Super     │   │ Show Error   │
            │ Admin?       │   │ "No user"    │
            └──────────────┘   └──────────────┘
                 ↙      ↘
              YES        NO
               ↓          ↓
    ┌──────────────┐  ┌──────────────────────┐
    │ Show         │  │ Redirect to          │
    │ Dashboard    │  │ /tracking/{user-id}  │
    └──────────────┘  └──────────────────────┘
         ↓                      ↓
    ┌──────────────┐  ┌──────────────────────┐
    │ Can view all │  │ Show own tracking    │
    │ employees    │  │ page only            │
    └──────────────┘  └──────────────────────┘
         ↓                      ↓
    ┌──────────────┐  ┌──────────────────────┐
    │ "Back to     │  │ No "Back to          │
    │ Dashboard"   │  │ Dashboard" button    │
    │ visible      │  │                      │
    └──────────────┘  └──────────────────────┘
```

## Detailed Access Flow

### Scenario 1: Regular Employee Login

```
┌─────────────────────────────────────────────────────────────────┐
│ REGULAR EMPLOYEE (ID: emp-123)                                   │
└─────────────────────────────────────────────────────────────────┘

Step 1: User opens browser
        ↓
Step 2: Navigates to: https://tracking.jbdspower.in/
        ↓
Step 3: Index.tsx loads
        ↓
Step 4: Check localStorage
        user._id = "emp-123"
        ↓
Step 5: Is user super admin?
        "emp-123" === "67daa55d9c4abb36045d5bfe" → NO
        ↓
Step 6: Redirect to /tracking/emp-123
        window.location.href = "/tracking/emp-123"
        ↓
Step 7: Tracking.tsx loads
        ↓
Step 8: Validate URL
        employeeId from URL = "emp-123"
        user._id from localStorage = "emp-123"
        Match? YES → Allow access
        ↓
Step 9: Render tracking page
        - Show employee's own data
        - Hide "Back to Dashboard" button
        - Prevent access to other pages
        ↓
Step 10: User sees their tracking page ✅
```

### Scenario 2: Super Admin Login

```
┌─────────────────────────────────────────────────────────────────┐
│ SUPER ADMIN (ID: 67daa55d9c4abb36045d5bfe)                      │
└─────────────────────────────────────────────────────────────────┘

Step 1: User opens browser
        ↓
Step 2: Navigates to: https://tracking.jbdspower.in/
        ↓
Step 3: Index.tsx loads
        ↓
Step 4: Check localStorage
        user._id = "67daa55d9c4abb36045d5bfe"
        ↓
Step 5: Is user super admin?
        "67daa55d9c4abb36045d5bfe" === "67daa55d9c4abb36045d5bfe" → YES
        ↓
Step 6: Stay on root page
        No redirect
        ↓
Step 7: Render dashboard
        - Show all employees
        - Show analytics
        - Show management options
        ↓
Step 8: User clicks employee "emp-123"
        Navigate to /tracking/emp-123
        ↓
Step 9: Tracking.tsx loads
        ↓
Step 10: Validate access
         Is super admin? YES → Allow access
         ↓
Step 11: Render tracking page
         - Show employee's data
         - Show "Back to Dashboard" button
         ↓
Step 12: User sees tracking page with back button ✅
```

### Scenario 3: Unauthorized Access Attempt

```
┌─────────────────────────────────────────────────────────────────┐
│ EMPLOYEE A tries to access EMPLOYEE B's page                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: Employee A logged in
        user._id = "emp-a-123"
        ↓
Step 2: Manually types URL:
        https://tracking.jbdspower.in/tracking/emp-b-456
        ↓
Step 3: Tracking.tsx loads
        ↓
Step 4: Extract employeeId from URL
        employeeId = "emp-b-456"
        ↓
Step 5: Check localStorage
        user._id = "emp-a-123"
        ↓
Step 6: Is user super admin?
        "emp-a-123" === "67daa55d9c4abb36045d5bfe" → NO
        ↓
Step 7: Does URL match user ID?
        "emp-b-456" === "emp-a-123" → NO
        ↓
Step 8: Access DENIED
        Show toast: "You can only access your own tracking page"
        ↓
Step 9: Redirect to own page
        navigate("/tracking/emp-a-123")
        ↓
Step 10: User redirected to their own page ✅
```

## Component Security Checks

### Index.tsx (Root Page)

```typescript
┌─────────────────────────────────────────┐
│ Index.tsx - Root Page Security          │
└─────────────────────────────────────────┘

useEffect(() => {
  const user = JSON.parse(localStorage.getItem("user"));
  
  if (user) {
    const isSuperAdmin = user._id === "67daa55d9c4abb36045d5bfe";
    
    if (!isSuperAdmin) {
      // 🔒 REDIRECT: Regular user to their tracking page
      window.location.href = `/tracking/${user._id}`;
    } else {
      // ✅ ALLOW: Super admin stays on dashboard
    }
  } else {
    // ❌ ERROR: No user data
  }
}, []);
```

### Tracking.tsx (Tracking Page)

```typescript
┌─────────────────────────────────────────┐
│ Tracking.tsx - Tracking Page Security   │
└─────────────────────────────────────────┘

useEffect(() => {
  // 🔒 CHECK 1: Employee ID in URL
  if (!employeeId) {
    toast({ title: "Access Denied" });
    return;
  }
  
  // 🔒 CHECK 2: User authorization
  const user = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = user._id === "67daa55d9c4abb36045d5bfe";
  
  if (!isSuperAdmin && user._id !== employeeId) {
    // ❌ DENY: User trying to access another's page
    toast({ title: "Access Denied" });
    navigate(`/tracking/${user._id}`);
    return;
  }
  
  // ✅ ALLOW: Load tracking data
  fetchEmployee();
  fetchMeetings();
}, [employeeId]);

// 🔒 BACK BUTTON: Only for super admin
const isSuperAdmin = currentUser?._id === "67daa55d9c4abb36045d5bfe";
const showBackButton = isSuperAdmin;
```

## Security Matrix

```
┌──────────────────┬─────────────┬─────────────┬─────────────┐
│ Action           │ Super Admin │ Regular Emp │ No Auth     │
├──────────────────┼─────────────┼─────────────┼─────────────┤
│ Access /         │ ✅ Dashboard│ ❌ Redirect │ ❌ Error    │
├──────────────────┼─────────────┼─────────────┼─────────────┤
│ Access /tracking │             │             │             │
│ /{own-id}        │ ✅ Allow    │ ✅ Allow    │ ❌ Error    │
├──────────────────┼─────────────┼─────────────┼─────────────┤
│ Access /tracking │             │             │             │
│ /{other-id}      │ ✅ Allow    │ ❌ Redirect │ ❌ Error    │
├──────────────────┼─────────────┼─────────────┼─────────────┤
│ See "Back to     │             │             │             │
│ Dashboard"       │ ✅ Visible  │ ❌ Hidden   │ ❌ Hidden   │
├──────────────────┼─────────────┼─────────────┼─────────────┤
│ Access /dashboard│ ✅ Allow    │ ❌ Redirect │ ❌ Error    │
└──────────────────┴─────────────┴─────────────┴─────────────┘
```

## Error Messages

```
┌─────────────────────────────────────────────────────────────────┐
│ Error Scenario                    │ Message Shown                │
├───────────────────────────────────┼──────────────────────────────┤
│ No employee ID in URL             │ "Please access the tracking  │
│                                   │  page with a valid employee  │
│                                   │  ID"                         │
├───────────────────────────────────┼──────────────────────────────┤
│ Accessing another employee's page │ "You can only access your    │
│                                   │  own tracking page"          │
├───────────────────────────────────┼──────────────────────────────┤
│ No user in localStorage           │ "No user found - access      │
│                                   │  denied"                     │
└───────────────────────────────────┴──────────────────────────────┘
```

## URL Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ URL: https://tracking.jbdspower.in/tracking/emp-123             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Extract employeeId
                    employeeId = "emp-123"
                              ↓
                    Get user from localStorage
                    user._id = "emp-456"
                              ↓
                    ┌─────────────────┐
                    │ Is Super Admin? │
                    └─────────────────┘
                         ↙         ↘
                      YES           NO
                       ↓             ↓
              ✅ Allow Access   ┌──────────────┐
                               │ Does URL ID   │
                               │ match user ID?│
                               └──────────────┘
                                    ↙      ↘
                                 YES        NO
                                  ↓          ↓
                          ✅ Allow    ❌ Redirect to
                             Access      /tracking/emp-456
```

## Summary

### Security Layers

1. **Layer 1: Root URL Protection**
   - Checks user role
   - Redirects non-admin users

2. **Layer 2: URL Validation**
   - Validates employee ID exists
   - Checks user authorization

3. **Layer 3: UI Restrictions**
   - Hides back button for regular users
   - Shows appropriate error messages

### Key Points

✅ **Multiple validation points** ensure security
✅ **Clear error messages** guide users
✅ **Automatic redirects** prevent confusion
✅ **Role-based access** separates admin and regular users
✅ **URL-based auth** requires employee ID in URL

### Protection Against

❌ Direct root URL access by regular users
❌ Cross-employee data access
❌ Missing employee ID in URL
❌ Unauthorized navigation
❌ Dashboard access by regular users
