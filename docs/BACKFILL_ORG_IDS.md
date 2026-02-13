# Backfill org_id for Existing Data

## Problem

When migration `014_multi_tenant_platform.sql` added `org_id` columns to tables, it only added the columns but didn't backfill existing data. This means:

- Existing **topics** have `org_id = NULL`
- Existing **documents** have `org_id = NULL`
- Existing **embeddings** are handled by migration `019`

The ElevenLabs webhook requires topics to have `org_id` set, which is why you got the error:
```
{"error":"Topic is missing org_id; backfill required"}
```

## Solution

Apply the backfill migrations created to fix this issue.

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://bltbmfxcqxiwfbsjojlk.supabase.co
2. Navigate to **SQL Editor**
3. Run migration `020_backfill_topic_org_ids.sql`:
   ```sql
   -- Backfill org_id for topics based on the user_id (topic creator)
   UPDATE topics
   SET org_id = users.org_id
   FROM users
   WHERE topics.user_id = users.id
     AND topics.org_id IS NULL
     AND users.org_id IS NOT NULL;
   ```

4. Run migration `021_backfill_document_org_ids.sql`:
   ```sql
   -- Backfill org_id for documents based on their topic's org_id
   UPDATE documents
   SET org_id = topics.org_id
   FROM topics
   WHERE documents.topic_id = topics.id
     AND documents.org_id IS NULL
     AND topics.org_id IS NOT NULL;

   -- Fallback: If topic doesn't have org_id, use the document creator's org_id
   UPDATE documents
   SET org_id = users.org_id
   FROM users
   WHERE documents.user_id = users.id
     AND documents.org_id IS NULL
     AND users.org_id IS NOT NULL;
   ```

### Option 2: Via Supabase CLI

If you have Supabase CLI installed and your project linked:

```bash
# From project root
supabase db push
```

This will automatically apply all pending migrations including the backfill scripts.

### Option 3: Direct SQL Connection

If you have the database URL, you can run migrations directly:

```bash
# Set your database URL
export DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Apply migrations
psql $DATABASE_URL -f supabase/migrations/020_backfill_topic_org_ids.sql
psql $DATABASE_URL -f supabase/migrations/021_backfill_document_org_ids.sql
```

## Verify

After running the migrations, verify all data has `org_id` set:

```sql
SELECT
  (SELECT COUNT(*) FROM topics WHERE org_id IS NULL) as topics_without_org,
  (SELECT COUNT(*) FROM documents WHERE org_id IS NULL) as documents_without_org,
  (SELECT COUNT(*) FROM document_embeddings WHERE org_id IS NULL) as embeddings_without_org;
```

Expected result: All counts should be `0`.

## Test the Webhook Again

After backfilling, test your webhook:

```bash
curl -X POST http://localhost:3000/api/voice/tools/search \
  -H "Authorization: Bearer f00965da9dab190ddbf665de34fdb5357ab1ed6331f8c0ceb06deeebf5d7468b" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test search query",
    "topic_id": "44c33ceb-c218-405a-855b-a91156b4f6af",
    "mode": "normal"
  }'
```

You should now get a successful response with search results! 🎉

## Future Prevention

New topics and documents created via the app will automatically have `org_id` set because:

1. **Topic creation** (`contexts/project-context.tsx` line 131):
   ```typescript
   org_id: profile.org_id,  // ✅ Set on creation
   ```

2. **Document creation** (`contexts/project-context.tsx` line 193):
   ```typescript
   org_id: profile.org_id,  // ✅ Set on creation
   ```

3. **Embedding creation** (`lib/embeddings/processor.ts` line 221):
   ```typescript
   org_id: orgId,  // ✅ Set on creation
   ```

This was purely a migration issue for existing data.
