# Employee 404 Error - Troubleshooting Guide

## The Error

```
Failed to fetch employee: 404
```

## Root Causes & Solutions

### 1. **Employee Belongs to Different Admin (Most Common)**

**Problem:** The employee was created by a different admin user, but you're logged in as a different admin.

**How to Check:**
Look in terminal for:
```
📋 Employee found: { created_by: 'xxx-yyy', matches_user: false }
```

**Solution:**
- Log in as the correct admin who created the employee
- OR create a new employee while logged in as current admin
- OR delete and recreate the employee

---

### 2. **Employee Doesn't Exist**

**Problem:** The employee ID in the URL doesn't exist in database.

**How to Check:**
Look for:
```
❌ Employee abc-123 does not exist in database
```

**Solution:**
- Go to Employees page
- Create a new employee
- Use that employee in assessment wizard

---

### 3. **RLS Policy Issue**

**Problem:** Row Level Security is blocking access.

**How to Check:**
Terminal shows employee exists but still returns 404.

**Solution:**
Check Supabase RLS policies for `employees` table:
1. Go to Supabase Dashboard
2. Database → employees table
3. Click "Policies" tab
4. Verify policy: `"Admins can view their employees"`
   ```sql
   (auth.uid() = created_by)
   ```

---

## Quick Fix Steps

### Option 1: Create New Employee
1. Go to Employees page in your app
2. Click "Add New Employee"
3. Fill in details and save
4. Use this employee in assessment wizard

### Option 2: Check Which Admin You Are
1. Open browser console
2. Type: `localStorage.getItem('supabase.auth.token')`
3. Check the user ID in the token
4. Compare with employee's `created_by` field in database

### Option 3: Re-login
1. Log out completely
2. Clear browser cache/cookies
3. Log back in
4. Try again

---

## Permanent Solution (If Problem Persists)

If you need employees to be accessible by ALL admins (not just creator):

### Update RLS Policy

```sql
-- In Supabase SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can view their employees" ON employees;

-- Create new policy that allows all authenticated admins
CREATE POLICY "All admins can view employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id
    )
  );
```

**Warning:** This allows ANY logged-in admin to see ALL employees. Only do this if you want shared access.

---

## How to Debug

### Check Current User ID
Add this to your code temporarily:
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('Current admin user ID:', user?.id)
```

### Check Employee Created By
In Supabase dashboard:
```sql
SELECT id, email, full_name, created_by 
FROM employees 
WHERE id = 'your-employee-id-here';
```

Compare the `created_by` with your current user ID.

---

## Prevention

**Best Practice:** Always create employees while logged in as the admin who will use them.

**Multi-Admin Setup:** If multiple admins need access to same employees, you'll need to:
1. Update RLS policies (see above)
2. OR create a shared admin account
3. OR implement proper organization/team structure
