# Authentication & Authorization Test Plan

## Overview
This document outlines test cases to verify the invite-only authentication system and role-based access control are working correctly.

## Test Setup

### Create Test Users
You'll need the following test accounts:

1. **Admin User** - Has an invite with role='admin'
2. **Employee User** - Has an invite with role='employee'
3. **No Invite User** - Does NOT have an invite in the invites table
4. **Suspended User** - Has a user record with status='suspended'
5. **Platform Owner** - Email matches PLATFORM_OWNER_EMAIL env variable

## Test Cases

### 1. New User Without Invite

**Steps:**
1. Sign in with a Google account that has NOT been invited
2. Complete OAuth flow

**Expected Result:**
- User is signed out automatically
- Redirected to `/no-organization` page
- Page displays message: "You don't have access to any organization"
- Page shows instructions to request an invitation
- "Sign Out" button is available

**Pass/Fail:** ___

---

### 2. New User With Valid Invite

**Steps:**
1. Create an invite in the invites table with role='employee'
2. Sign in with the same email address used in the invite
3. Complete OAuth flow

**Expected Result:**
- User is successfully authenticated
- User record is created in users table with correct org_id and role
- Invite status is updated to 'accepted'
- User is redirected to `/dashboard`
- Dashboard shows employee view (no admin features)

**Pass/Fail:** ___

---

### 3. Existing User With org_id = NULL

**Steps:**
1. Manually set an existing user's org_id to NULL in the database
2. Sign in with that user

**Expected Result:**
- System checks for pending invites
- If no pending invite: User is signed out and redirected to `/no-organization`
- If pending invite exists: User's org_id and role are updated from the invite

**Pass/Fail:** ___

---

### 4. Employee User Accessing Dashboard

**Steps:**
1. Sign in as employee user
2. View dashboard

**Expected Result:**
- Dashboard title: "My Dashboard"
- Dashboard description: "Welcome back! Here's your assessment progress."
- Sidebar shows only: Dashboard, Assessments, Settings, Support
- Sidebar does NOT show: Knowledge Base, Employees, Analytics
- User role in sidebar shows "Employee" (not "Administrator")

**Pass/Fail:** ___

---

### 5. Employee User Accessing Admin Pages

**Steps:**
1. Sign in as employee user
2. Try to access each admin-only page:
   - `/team-members`
   - `/knowledge-base`
   - `/analytics`

**Expected Result:**
- All pages redirect to `/dashboard`
- User sees redirecting/loading message briefly
- No admin content is displayed

**Pass/Fail:** ___

---

### 6. Admin User Accessing Dashboard

**Steps:**
1. Sign in as admin user
2. View dashboard

**Expected Result:**
- Dashboard title: "Admin Dashboard"
- Dashboard description: "Welcome back! Here's what's happening with your organization."
- Sidebar shows all items: Dashboard, Knowledge Base, Assessments, Employees, Analytics, Settings, Support
- User role in sidebar shows "Admin"
- Quick actions include: Create New Assessment, Manage Team Members, Add to Knowledge Base

**Pass/Fail:** ___

---

### 7. Admin User Accessing Admin Pages

**Steps:**
1. Sign in as admin user
2. Access each admin page:
   - `/team-members`
   - `/knowledge-base`
   - `/analytics`

**Expected Result:**
- All pages load successfully
- Full admin functionality is available
- No redirects occur

**Pass/Fail:** ___

---

### 8. Assessments Page - Admin View

**Steps:**
1. Sign in as admin user
2. Go to `/assessments`

**Expected Result:**
- Page description: "Manage employee evaluations and assessments"
- "New Assessment" button is visible
- "Export" button is visible
- "Types" button is visible
- Can see all organization assessments (via RLS)

**Pass/Fail:** ___

---

### 9. Assessments Page - Employee View

**Steps:**
1. Sign in as employee user
2. Go to `/assessments`

**Expected Result:**
- Page description: "View and complete your assigned assessments"
- "New Assessment" button is NOT visible
- "Export" button is NOT visible
- "Types" button is NOT visible
- Can only see own assessments (via RLS)
- Empty state message: "Your administrator hasn't assigned any assessments to you yet."

**Pass/Fail:** ___

---

### 10. Suspended User

**Steps:**
1. Set user status to 'suspended' in database
2. Try to sign in with that user

**Expected Result:**
- User is signed out
- Redirected to `/login?error=account_suspended`
- Cannot access the system

**Pass/Fail:** ___

---

### 11. Pending Approval User

**Steps:**
1. Create user with status='pending' and valid org_id
2. Sign in with that user

**Expected Result:**
- User is redirected to `/pending-approval` page
- Page shows "Account Pending Approval" message
- Cannot access dashboard or other pages
- Can sign out

**Pass/Fail:** ___

---

### 12. Platform Owner

**Steps:**
1. Sign in with email that matches PLATFORM_OWNER_EMAIL
2. Complete OAuth flow

**Expected Result:**
- User is created with role='admin', org_id=null
- Redirected to `/platform-owner` page (not `/dashboard`)
- Has access to platform-level management
- Not restricted by org_id requirements

**Pass/Fail:** ___

---

### 13. Expired Invite

**Steps:**
1. Create invite with expires_at in the past
2. Try to sign in with that invite's email

**Expected Result:**
- Invite is not accepted
- User is signed out
- Redirected to `/no-organization`

**Pass/Fail:** ___

---

### 14. Multiple Invites - Most Recent Used

**Steps:**
1. Create multiple invites for same email (different organizations)
2. Sign in with that email

**Expected Result:**
- Most recent valid (non-expired, pending) invite is used
- User is assigned to the organization from the most recent invite
- That invite is marked as accepted
- Other invites remain in their original state

**Pass/Fail:** ___

---

### 15. Middleware Protection

**Steps:**
1. Sign in as employee user
2. Try to directly access (via URL bar):
   - `/team-members`
   - `/knowledge-base`
   - `/analytics`

**Expected Result:**
- Middleware catches the request before page loads
- User is redirected to appropriate page
- No protected content is exposed

**Pass/Fail:** ___

---

### 16. Navigation Menu - Employee

**Steps:**
1. Sign in as employee user
2. Check sidebar navigation

**Expected Result:**
- Menu items visible: Dashboard, Assessments, Settings, Support
- Menu items NOT visible: Knowledge Base, Employees, Analytics
- Clicking visible items navigates successfully
- Admin items don't appear even temporarily

**Pass/Fail:** ___

---

### 17. RLS Policies - Assessments

**Steps:**
1. Create assessments for different employees
2. Sign in as employee user
3. Go to assessments page

**Expected Result:**
- Employee can only see their own assessments (where employee_id = user.id)
- Cannot see other employees' assessments
- RLS policy enforces this at database level

**Pass/Fail:** ___

---

### 18. RLS Policies - Team Members

**Steps:**
1. Sign in as employee user
2. Try to access `/api/employees` endpoint directly

**Expected Result:**
- API returns only users in the same organization
- Cannot see users from other organizations
- RLS policy enforces this at database level

**Pass/Fail:** ___

---

## Regression Tests

### 19. Existing Admin Still Works

**Steps:**
1. Sign in with existing admin user (who was created before this fix)
2. Verify all functionality

**Expected Result:**
- Admin can still access all pages
- All admin features work correctly
- No breaking changes for existing users

**Pass/Fail:** ___

---

### 20. Logout and Re-login

**Steps:**
1. Sign in as any user
2. Sign out
3. Sign in again

**Expected Result:**
- Second sign-in follows same authentication rules
- User data is still correct
- No duplicate user records created

**Pass/Fail:** ___

---

## Database Verification

After running tests, verify in database:

### Check Users Table
```sql
SELECT id, email, org_id, role, status 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

**Verify:**
- All users have correct org_id (except platform owner)
- Roles are correctly assigned from invites
- Status is appropriate for each user

### Check Invites Table
```sql
SELECT email, org_id, role, status, accepted_at, expires_at 
FROM invites 
ORDER BY created_at DESC 
LIMIT 10;
```

**Verify:**
- Accepted invites have accepted_at timestamp
- Accepted invites have status = 'accepted'
- Expired invites cannot be used

## Console Log Verification

Check browser console and server logs for:
- "✅" marks for successful operations
- "❌" marks for denied operations
- Clear logging of authentication flow
- No unexpected errors

## Summary

Total Test Cases: 20
- Passed: ___
- Failed: ___
- Not Tested: ___

## Issues Found

Document any issues discovered during testing:

1. _______________________
2. _______________________
3. _______________________

## Sign-off

Tested by: ________________
Date: ________________
