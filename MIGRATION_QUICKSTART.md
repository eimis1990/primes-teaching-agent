# Quick Start: Multi-Tenant Migration

## Step 1: Update Environment Variables

Edit `.env.local` and replace `your-email@example.com` with your actual email:

```bash
PLATFORM_OWNER_EMAIL=your-actual-email@gmail.com
```

## Step 2: Run the Migration SQL

You have two options:

### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/bltbmfxcqxiwfbsjojlk
2. Click "SQL Editor" in the left sidebar
3. Copy the entire contents of `supabase/migrations/014_multi_tenant_platform.sql`
4. Paste into SQL Editor
5. Click "Run" button
6. Wait for "Success" message

### Option B: Via CLI

```bash
# Make sure Docker is running
# Make sure you're in the project directory
cd /Users/eimantaskudarauskas/Documents/primes-teaching-agent

# If local Supabase is set up:
npx supabase migration up

# Or link to remote and push:
npx supabase link --project-ref bltbmfxcqxiwfbsjojlk
npx supabase db push
```

## Step 3: Verify Migration

Run this SQL in Supabase SQL Editor to verify:

```sql
-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'invites');

-- Check users table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('org_id', 'role', 'status', 'position');

-- Check employees table is gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'employees';
-- Should return empty (table should not exist)
```

Expected results:
- ✅ `organizations` and `invites` tables exist
- ✅ `users` table has `org_id`, `role`, `status`, `position` columns
- ✅ `employees` table does NOT exist

## What This Migration Does

### Creates:
- `organizations` table (for multi-tenancy)
- `invites` table (for inviting users)
- New enum types: `user_role`, `user_status`, `invite_status`

### Updates:
- Extends `users` table with: `org_id`, `role`, `status`, `position`, `is_active`, `last_login_at`
- Adds `org_id` to: topics, documents, conversations, question_banks, assessment_types, assessments, question_library
- Updates all RLS policies for multi-tenant access

### Removes:
- `employees` table (replaced by `users` table with role='employee')
- All employee-related RLS policies

### Creates Functions:
- `handle_new_user()` - Automatically handles user signup based on invites/domains
- `expire_old_invites()` - Marks expired invites
- `check_domain_match()` - Checks if email matches org's allowed domains

## Common Issues

### Issue: "column org_id does not exist"
**Solution:** Run the migration again. Some `ALTER TABLE` commands may have failed.

### Issue: "table users does not exist"
**Solution:** The `users` table should be auto-created by Supabase Auth. Check if you've enabled authentication in your Supabase project.

### Issue: "employees table still exists"
**Solution:** The migration has `DROP TABLE IF EXISTS employees CASCADE` which should remove it. If it still exists, manually drop it:
```sql
DROP TABLE IF EXISTS employees CASCADE;
```

### Issue: "permission denied for table auth.users"
**Solution:** The trigger on `auth.users` may fail. This is okay - you can implement the signup logic in your Edge Function or API route instead.

## Next Steps

After running the migration successfully:

1. ✅ Migration is complete
2. ⏭️ Ask me to proceed with code changes:
   - Update authentication flow
   - Remove employee password auth
   - Update all API routes
   - Create new UI components
   - Build platform owner panel
   - Build invite system

Say "proceed with code changes" and I'll start implementing everything!
