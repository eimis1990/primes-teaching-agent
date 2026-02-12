# How to Apply the Question Library Migration

You need to apply the database migration to add the `question_library` table.

## Option 1: Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New query" button

3. **Copy and Paste Migration**
   - Open file: `supabase/migrations/013_question_library.sql`
   - Copy all contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - You should see "Success. No rows returned"

5. **Verify**
   - Go to "Database" → "Tables" in the left sidebar
   - You should see a new table: `question_library`

---

## Option 2: Supabase CLI (If you have it installed)

```bash
# Navigate to project directory
cd /Users/eimantaskudarauskas/Documents/primes-teaching-agent

# If you have Supabase CLI linked to your project:
supabase db push

# Or apply specific migration:
supabase db push --include-migrations 013_question_library
```

---

## Verify the Migration

After running the migration, verify it worked:

### Check in Supabase Dashboard:

1. Go to **Database** → **Tables**
2. Find `question_library` table
3. Click on it to see columns:
   - id
   - user_id
   - topic_id
   - question_text
   - question_type
   - options
   - correct_answer
   - expected_keywords
   - explanation
   - difficulty
   - points
   - source_chunk_text
   - usage_count
   - is_active
   - created_at
   - updated_at

### Check RLS Policies:

1. In the `question_library` table view
2. Click "Policies" tab
3. You should see 4 policies:
   - Users can view their question library
   - Users can insert their question library
   - Users can update their question library
   - Users can delete their question library

---

## Troubleshooting

### Error: "relation already exists"

The table might already exist. Check if `question_library` table is in your database. If it's there, the migration was already applied.

### Error: "function update_updated_at_column does not exist"

This function should have been created in migration `006_assessments_system.sql`. Make sure previous migrations were applied.

### Error: "type question_type does not exist"

The enum types should have been created in migration `006_assessments_system.sql`. Verify previous migrations are applied.

---

## After Migration

Once the migration is complete:

1. **Restart your Next.js dev server** (if running)
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

2. **Test the feature**
   - Go to Assessments → Create New Assessment
   - Complete Step 1 and Step 2
   - In Step 3, you should see two tabs:
     - "Generate New"
     - "Use From Library"

3. **Generate and save questions**
   - Use "Generate New" tab
   - Generate some questions
   - Select questions you want to keep
   - Click "Save X to Library"
   - You should see a success message

4. **Use library questions**
   - Start creating another assessment
   - In Step 3, click "Use From Library" tab
   - You should see your saved questions
   - Select questions and create assessment

---

## Need Help?

If you encounter any issues:

1. Check Supabase logs in Dashboard → Logs
2. Check browser console for errors
3. Verify all previous migrations (001-012) were applied
4. Make sure your Supabase project is connected properly
