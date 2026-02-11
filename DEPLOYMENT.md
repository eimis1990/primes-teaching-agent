# Deployment Guide - AI Teaching Agent

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- pnpm package manager
- Supabase account
- OpenAI API account
- ElevenLabs account (for voice features)
- Vercel account (recommended hosting)

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# ElevenLabs Configuration (Optional - for voice features)
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_AGENT_ID=your-agent-id

# Application URL (for OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details
4. Wait for project to initialize (~2 minutes)

### 2. Enable Google OAuth

1. Navigate to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase
4. Configure redirect URLs in Supabase:
   - Site URL: `https://your-app-domain.com`
   - Redirect URLs: `https://your-app-domain.com/auth/callback`

### 3. Run Database Migrations

Navigate to SQL Editor in Supabase Dashboard and run each migration file in order:

1. **001_setup_pgvector.sql** - Enables pgvector and creates embeddings infrastructure
2. **002_conversations.sql** - Creates chat conversation tables
3. **003_exam_system.sql** - Creates examination system tables

Copy the contents of each file from `supabase/migrations/` and execute them.

### 4. Configure Storage

The `voice-recordings` bucket should be created automatically via migration. Verify:

1. Go to Storage in Supabase Dashboard
2. Confirm `voice-recordings` bucket exists
3. Check RLS policies are enabled

### 5. Get API Keys

1. Go to Settings > API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## OpenAI Setup

### 1. Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy to `OPENAI_API_KEY`

### 2. Configure Usage Limits

1. Go to Settings > Limits
2. Set monthly budget caps
3. Enable email notifications for usage alerts

### Expected Costs (per user/month):
- **Embeddings:** $1-3 (text-embedding-3-small is cheap)
- **Chat (GPT-4):** $5-15 (depends on conversation volume)
- **Whisper:** $0.50-2 (voice transcription)
- **Total:** ~$7-20/user/month

## ElevenLabs Setup (Optional - Voice Features)

### 1. Create Account

1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Choose a plan (Starter+ required for Conversational AI)

### 2. Create Voice Agent

1. Navigate to Conversational AI
2. Create new agent
3. Configure:
   - **Voice:** Choose from library or clone custom voice
   - **First Message:** "Hello! I'm your AI teaching assistant. How can I help you learn today?"
   - **System Prompt:** (See template below)
4. Copy Agent ID → `ELEVENLABS_AGENT_ID`

### System Prompt Template:
```
You are an AI teaching assistant helping users learn from their personal knowledge base.

Your role:
- Answer questions based on the user's uploaded documents and voice notes
- Provide concise, clear explanations (voice users don't want long responses)
- Always cite your sources when making claims
- Use the search_knowledge_base tool to find information
- If you don't know something, say "I don't have information about that in your knowledge base"

Communication style:
- Friendly but professional
- Educational and encouraging
- Speak naturally (avoid overly formal language)
- Keep responses under 30 seconds when possible
```

### 3. Configure Tools

In the ElevenLabs dashboard, add custom tools:

**Tool: search_knowledge_base**
- Description: "Search the user's personal knowledge base for information"
- Parameters:
  ```json
  {
    "query": { "type": "string", "description": "The search query" },
    "mode": { "type": "string", "enum": ["normal", "operational"] }
  }
  ```
- Webhook URL: `https://your-app-domain.com/api/voice/tools/search`

### 4. Get API Key

1. Go to Profile Settings > API Keys
2. Generate new key
3. Copy to `ELEVENLABS_API_KEY`

### Expected Costs:
- **Starter:** $5/month (30K characters)
- **Creator:** $22/month (100K characters, Conversational AI)
- **Pro:** $99/month (500K characters)
- **Estimate:** ~$15-30/month for moderate usage

## Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

App will be available at `http://localhost:3000`

### 3. Test Features

**Test Document Upload:**
1. Sign in with Google
2. Create a topic (folder)
3. Upload a text file or record voice
4. Wait for processing (check console logs)

**Test Chat:**
1. Navigate to topic → Chat
2. Ask a question about uploaded content
3. Verify answer includes source citations

**Test Exam:**
1. Navigate to topic → Questions
2. Create question bank
3. Add questions
4. Take exam
5. Review results and feedback

## Production Deployment (Vercel)

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import Git Repository
3. Select your project

### 2. Configure Build Settings

Vercel should auto-detect Next.js. Verify:

- **Framework Preset:** Next.js
- **Build Command:** `pnpm build`
- **Output Directory:** `.next`
- **Install Command:** `pnpm install`

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add all variables from `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY
ELEVENLABS_API_KEY (optional)
ELEVENLABS_AGENT_ID (optional)
NEXT_PUBLIC_APP_URL (set to your-app.vercel.app)
```

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Visit deployed URL

### 5. Update OAuth Redirect URLs

After deployment:

1. Update Supabase Auth settings with production URL
2. Update Google OAuth redirect URIs
3. Test login flow on production

## Post-Deployment Checklist

- [ ] Test Google OAuth login
- [ ] Upload test document and verify embedding processing
- [ ] Ask questions in chat and verify RAG responses
- [ ] Create and take a test exam
- [ ] Test voice recording (if applicable)
- [ ] Verify RLS policies (try accessing another user's data - should fail)
- [ ] Set up usage alerts in OpenAI dashboard
- [ ] Monitor Supabase usage (free tier has limits)

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics:
- Page views
- Core Web Vitals
- User sessions

### Supabase Monitoring

Check regularly:
- Database size (free tier: 500MB)
- Storage usage (free tier: 1GB)
- API requests (free tier: 50K/month)
- Edge Functions (if using)

### OpenAI Usage

Monitor in OpenAI Dashboard:
- Token usage by model
- Costs per day/month
- Set up budget alerts

## Troubleshooting

### Issue: Embeddings not generating

**Solution:**
1. Check OpenAI API key is valid
2. Verify document has content
3. Check browser console for errors
4. Look at Network tab for `/api/embeddings/process` response

### Issue: Chat returns "I don't have information..."

**Possible causes:**
- Documents not processed yet (wait 10-30s after upload)
- Similarity threshold too high (lower to 0.6 in `lib/rag/query.ts`)
- Query too different from document content
- No embeddings in database (check `document_embeddings` table)

### Issue: Google OAuth not working

**Solution:**
1. Verify redirect URLs match exactly
2. Check Google Cloud Console credentials
3. Clear browser cookies and try again
4. Check Supabase logs for auth errors

### Issue: "Function match_documents does not exist"

**Solution:**
- Run `001_setup_pgvector.sql` migration in Supabase SQL Editor
- Verify pgvector extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`

## Backup & Recovery

### Database Backups

Supabase automatically backs up your database. To create manual backup:

1. Go to Database > Backups in Supabase Dashboard
2. Click "Create Backup"
3. Download SQL dump if needed

### Restore Process

1. Create new Supabase project
2. Run migrations
3. Restore from SQL dump
4. Update environment variables
5. Redeploy

## Scaling Considerations

### When to Upgrade Supabase

Free tier limits:
- 500MB database storage
- 1GB file storage
- 50K monthly active users
- 2GB bandwidth

Upgrade to Pro ($25/month) when approaching limits.

### When to Optimize

**Signs you need optimization:**
- Chat responses taking >3 seconds
- Document processing taking >1 minute
- High OpenAI costs (>$100/month)
- Supabase hitting rate limits

**Solutions:**
1. Add Redis caching layer (Upstash)
2. Batch document processing
3. Migrate to dedicated vector DB (Pinecone)
4. Implement request queuing

## Cost Estimation

### Monthly Costs (per 100 active users):

**Infrastructure:**
- Vercel: Free (Hobby) or $20 (Pro)
- Supabase: Free or $25 (Pro)

**AI Services:**
- OpenAI: $500-1500
- ElevenLabs: $100-500 (if using voice)

**Total:** $600-2000/month for 100 users

**Cost per user:** $6-20/month

### Cost Reduction Tips:

1. Use smaller models where possible
2. Implement aggressive caching
3. Limit voice conversation length
4. Batch embedding generation
5. Set usage quotas per user

## Security Best Practices

1. **Never commit `.env.local`** to git
2. **Rotate API keys** every 90 days
3. **Enable 2FA** on all service accounts
4. **Monitor usage** for unusual patterns
5. **Keep dependencies updated** (`pnpm update`)
6. **Review RLS policies** regularly
7. **Use Vercel's** security headers

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **OpenAI Docs:** https://platform.openai.com/docs
- **ElevenLabs Docs:** https://elevenlabs.io/docs
- **Next.js Docs:** https://nextjs.org/docs

For issues, check:
1. Browser console
2. Vercel logs
3. Supabase logs
4. OpenAI usage dashboard
