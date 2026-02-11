# Setup Instructions - Run in Order

## Quick Overview

You need to run 3 SQL scripts in Supabase SQL Editor in order:

1. `STEP_1_CLEANUP.sql` - Remove problematic triggers
2. `supabase/migrations/014_multi_tenant_platform.sql` - Run the migration
3. `STEP_3_VERIFY.sql` - Verify everything worked

---

## Step 1: Clean Up Triggers

In **Supabase SQL Editor**, copy and paste the entire contents of:

```
STEP_1_CLEANUP.sql
```

Click **Run**.

✅ **Success if:** You see "Query returned successfully with no result" for the last query

---

## Step 2: Run the Migration

In **Supabase SQL Editor**, copy and paste the entire contents of:

```
supabase/migrations/014_multi_tenant_platform.sql
```

Click **Run**.

⏳ This may take 10-20 seconds.

✅ **Success if:** You see "Success. No rows returned"

---

## Step 3: Verify Setup

In **Supabase SQL Editor**, copy and paste the entire contents of:

```
STEP_3_VERIFY.sql
```

Click **Run**.

✅ **Success if:** All checks show ✅ green checkmarks in the Messages tab

---

## Step 4: Test Sign In

1. **Restart your dev server:**
   ```bash
   # Stop (Ctrl+C) and restart
   npm run dev
   ```

2. **Clear browser data:**
   - Open DevTools (F12)
   - Application tab → Clear storage
   - Or just use an Incognito window

3. **Sign in:**
   - Go to `http://localhost:3000/login`
   - Click "Continue with Google"
   - Sign in with: **e.kudarauskas@gmail.com**

4. **Check terminal:**
   You should see:
   ```
   === AUTH CALLBACK DEBUG ===
   User email: e.kudarauskas@gmail.com
   Platform owner email: e.kudarauskas@gmail.com
   Is platform owner: true
   ✅ Platform owner sign-in detected
   ✅ Platform owner user created successfully
   ```

5. **Success!**
   You'll be redirected to: `http://localhost:3000/platform-owner`

---

## Troubleshooting

### Still getting "Database error saving new user"?

1. Make sure you ran **all 3 SQL scripts** in order
2. Check that `STEP_3_VERIFY.sql` showed all ✅
3. Verify `.env.local` has both:
   ```bash
   PLATFORM_OWNER_EMAIL=e.kudarauskas@gmail.com
   NEXT_PUBLIC_PLATFORM_OWNER_EMAIL=e.kudarauskas@gmail.com
   ```
4. Restart dev server
5. Clear ALL browser data (not just cache)

### Check Supabase Logs

Go to Supabase Dashboard → Logs → check for errors

### Check Browser Console

F12 → Console tab → look for red errors

---

## What Each Step Does

**Step 1 (Cleanup):**
- Removes database triggers that interfere with Supabase Auth
- Ensures clean state

**Step 2 (Migration):**
- Creates `organizations` table
- Creates/extends `users` table with org_id, role, status
- Creates `invites` table
- Adds multi-tenant support to all data tables
- Updates all RLS policies

**Step 3 (Verify):**
- Checks all enums exist
- Checks all tables exist
- Shows table structure
- Confirms no problematic triggers

---

## After Successful Setup

You can now:

1. **Create Organizations** (as platform owner)
2. **Invite Admins** to organizations
3. **Admins can invite Employees**
4. **Employees can sign in** and access their organization's data

Everything is isolated by organization! 🎉
