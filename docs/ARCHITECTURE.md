# AI Teaching Agent - Architecture Documentation

## System Overview

The AI Teaching Agent is a voice-first intelligent assistant that learns from voice messages and documents, organizes knowledge into modular topics, and provides accurate answers with source citations. The system supports FAQ mode, examination/onboarding scenarios, and operational guidance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│                        (Next.js 16 / React 19)                   │
├─────────────────────────────────────────────────────────────────┤
│  • Document Management UI                                        │
│  • Chat Interface (Text & Voice)                                 │
│  • Examination Interface                                         │
│  • Question Bank Management                                      │
│  • Analytics Dashboard                                           │
└────────────┬───────────────────────────────────┬────────────────┘
             │                                   │
             ▼                                   ▼
┌────────────────────────┐         ┌────────────────────────────┐
│   API Routes Layer     │         │  External Services         │
│    (Next.js Edge/Node) │         ├────────────────────────────┤
├────────────────────────┤         │ • OpenAI GPT-4             │
│ • /api/chat            │◄────────┤ • OpenAI Whisper           │
│ • /api/embeddings      │         │ • OpenAI Embeddings        │
│ • /api/exam            │         │ • ElevenLabs Voice AI      │
│ • /api/voice           │────────►└────────────────────────────┘
└────────────┬───────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  RAG System                │  Exam System                        │
│  ├─ Document Processor     │  ├─ Answer Validator               │
│  ├─ Embedding Generator    │  ├─ Analytics Engine               │
│  ├─ Semantic Search        │  └─ Feedback Generator             │
│  └─ Answer Generator       │                                    │
├────────────────────────────┼────────────────────────────────────┤
│  Voice System              │  Conversation Manager              │
│  ├─ ElevenLabs Client      │  ├─ Session Management             │
│  ├─ Agent Tools            │  ├─ Message History                │
│  └─ Transcription Handler  │  └─ Context Tracking               │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer (Supabase)                       │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                             │
│  ├─ users, topics, documents                                    │
│  ├─ document_embeddings (pgvector)                              │
│  ├─ conversations, messages                                      │
│  └─ question_banks, questions, exam_sessions, exam_answers      │
│                                                                  │
│  Storage Bucket                                                  │
│  └─ voice-recordings (audio files)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Document Processing & Embedding Pipeline

**Purpose:** Convert voice recordings and text documents into searchable vector embeddings.

**Flow:**
1. User uploads document (text file or records voice)
2. Voice files transcribed via OpenAI Whisper
3. Document chunked into ~500-1000 token segments with overlap
4. Each chunk embedded using `text-embedding-3-small` (1536 dimensions)
5. Embeddings stored in `document_embeddings` table with metadata
6. pgvector index enables fast similarity search

**Key Files:**
- `lib/embeddings/processor.ts` - Chunking and embedding logic
- `app/actions/embeddings.ts` - Server actions for processing
- `app/api/embeddings/process/route.ts` - Background processing endpoint

**Scaling Considerations:**
- Current: Supabase pgvector (good for <100K documents)
- Future: Migrate to Pinecone or Qdrant for >100K documents
- Consider batching large document uploads

### 2. RAG (Retrieval-Augmented Generation) System

**Purpose:** Answer questions accurately by retrieving relevant context from embeddings.

**Flow:**
1. User asks question (text or voice)
2. Question embedded into vector
3. Semantic search via `match_documents()` RPC function
4. Top-K most similar chunks retrieved (cosine similarity)
5. Context formatted with source citations
6. GPT-4 generates answer based on context
7. Response streamed back to user

**Key Files:**
- `lib/rag/query.ts` - Semantic search implementation
- `lib/rag/generator.ts` - Answer generation with streaming
- `app/api/chat/route.ts` - Chat API endpoint

**Configuration:**
- `topK`: 5-10 chunks per query (tunable)
- `similarity_threshold`: 0.7 (adjust based on accuracy needs)
- Temperature: 0.3 (lower = more factual)

**Modes:**
- **Normal:** Detailed, educational responses
- **Operational:** Concise, action-oriented (for stress situations)

### 3. Voice Agent Integration (ElevenLabs)

**Purpose:** Enable natural voice conversations with the AI assistant.

**Flow:**
1. User initiates voice session
2. Frontend establishes WebSocket connection to ElevenLabs
3. User speaks → transcribed in real-time
4. Agent processes question using custom tools
5. Tools call RAG system to search knowledge base
6. Agent responds with voice output
7. Session ends when user disconnects

**Custom Tools:**
- `search_knowledge_base` - Query RAG system
- `get_document` - Retrieve specific document
- `list_topics` - Show available knowledge areas

**Key Files:**
- `lib/voice/elevenlabs-client.ts` - ElevenLabs SDK wrapper
- `lib/voice/agent-tools.ts` - Custom tool definitions
- `app/api/voice/session/route.ts` - Session management API
- `components/voice-chat.tsx` - Voice UI component

**Cost Management:**
- ElevenLabs charges per minute of conversation
- Implement usage quotas if needed
- Cache common queries in text mode as fallback

### 4. Examination System

**Purpose:** Assess knowledge, identify weak areas, and provide personalized recommendations.

**Components:**

**Question Bank Management:**
- Admins create question banks per topic
- Questions support multiple types: open-ended, scenario, true/false, multiple choice
- Each question has expected keywords, difficulty level, and point value

**Exam Flow:**
1. Student selects question bank
2. Exam session created
3. Questions presented one at a time
4. Answers submitted to `/api/exam/validate`
5. AI evaluates answer using GPT-4
6. Feedback provided immediately or at end
7. Session completed with score and analytics

**Answer Validation:**
- GPT-4 compares answer to expected keywords
- Generates constructive feedback
- Calculates score (0-1) and points earned
- Identifies found/missing keywords

**Analytics:**
- Weak area detection (topics < 70% score)
- Performance trends over time
- Personalized document recommendations
- Practice question suggestions

**Key Files:**
- `lib/exam/validator.ts` - AI answer validation
- `lib/exam/analytics.ts` - Performance analysis
- `app/api/exam/validate/route.ts` - Validation endpoint
- `app/project/[id]/questions/page.tsx` - Question management UI
- `app/project/[id]/exam/page.tsx` - Exam interface

### 5. Conversation Management

**Purpose:** Track chat history, support multi-turn conversations, and manage context.

**Features:**
- Persistent conversation storage in Supabase
- Multi-turn context handling (last N messages)
- Topic filtering (single or cross-topic queries)
- Auto-generated conversation titles

**Key Files:**
- `lib/chat/conversation-manager.ts` - CRUD operations
- `app/api/chat/route.ts` - Chat API with streaming

## Data Flow Examples

### FAQ Query Flow
```
User Question
    ↓
Generate Query Embedding (OpenAI)
    ↓
Vector Similarity Search (pgvector)
    ↓
Retrieve Top-K Chunks
    ↓
Format Context + Conversation History
    ↓
GPT-4 Answer Generation
    ↓
Stream Response to User
```

### Voice Conversation Flow
```
User Speaks
    ↓
ElevenLabs STT (Transcription)
    ↓
Agent Processes with Tools
    ↓
search_knowledge_base Tool Called
    ↓
RAG System Retrieves Context
    ↓
Agent Formulates Response
    ↓
ElevenLabs TTS (Voice Output)
    ↓
User Hears Response
```

### Document Upload Flow
```
Upload File/Record Voice
    ↓
Transcribe (if voice) via Whisper
    ↓
Save to Supabase (content + metadata)
    ↓
Background: Chunk Document
    ↓
Generate Embeddings (batched)
    ↓
Store in document_embeddings Table
    ↓
Document Ready for Search
```

## Security

### Authentication
- Supabase Auth with Google OAuth
- JWT-based session management
- Protected API routes require valid auth token

### Row Level Security (RLS)
- All tables have RLS policies enabled
- Users can only access their own data
- Policies enforced at database level

### Data Isolation
- User ID attached to all records
- RLS ensures cross-user data leakage impossible
- Vector searches filtered by `user_id`

## Performance Optimizations

### Current Optimizations
1. **Indexes:** pgvector IVFFlat index on embeddings
2. **Batching:** Process embeddings in batches of 10
3. **Streaming:** Real-time response streaming for chat
4. **Edge Runtime:** Fast API responses for chat endpoints

### Future Optimizations
1. **Caching:** Redis for frequent queries
2. **CDN:** Cloudflare for static assets
3. **Connection Pooling:** Supabase connection pooler
4. **Lazy Loading:** Paginate large conversation histories

## Monitoring & Observability

### Recommended Tools
- **Langfuse:** RAG pipeline debugging and tracing
- **LangSmith:** LLM call monitoring and evaluation
- **Supabase Logs:** Database query performance
- **Vercel Analytics:** Frontend performance

### Key Metrics to Track
- RAG answer quality (manual spot checks)
- Average similarity scores (should be > 0.75 for good results)
- Response times (chat, voice, embeddings)
- Token usage costs (OpenAI, ElevenLabs)
- Exam completion rates and scores

## Technology Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion

**Backend:**
- Next.js API Routes (Edge & Node.js runtimes)
- Supabase (PostgreSQL + Auth + Storage)
- pgvector extension

**AI Services:**
- OpenAI GPT-4 Turbo (chat generation)
- OpenAI Whisper (voice transcription)
- OpenAI text-embedding-3-small (embeddings)
- ElevenLabs Conversational AI (voice agent)

**Infrastructure:**
- Vercel (hosting & deployment)
- Supabase (managed Postgres + Storage)

## Scaling Path

### Current Capacity
- **Documents:** ~10K per user
- **Concurrent Users:** ~100
- **Conversations:** Unlimited
- **Voice Sessions:** Limited by ElevenLabs quota

### Scaling Triggers

**When to Scale (>100K documents):**
1. Migrate to dedicated vector database (Pinecone/Qdrant)
2. Add Redis caching layer
3. Implement background job queue (BullMQ, Inngest)
4. Consider read replicas for Supabase

**When to Optimize Costs:**
1. Fine-tune smaller models on domain data
2. Implement aggressive caching
3. Use cheaper embeddings for less critical searches
4. Batch voice transcriptions

## Development Workflow

1. **Local Development:**
   ```bash
   pnpm dev  # Start Next.js
   ```

2. **Database Migrations:**
   - SQL files in `supabase/migrations/`
   - Run via Supabase Dashboard SQL Editor

3. **Environment Variables:**
   - `.env.local` for local development
   - Vercel dashboard for production

4. **Testing:**
   - Manual testing via UI
   - Test RAG accuracy with known questions
   - Validate exam scoring logic

## Known Limitations & Future Enhancements

**Current Limitations:**
1. No multi-user collaboration features
2. Voice agent is placeholder (needs full ElevenLabs integration)
3. No real-time document preview during upload
4. Limited exam question types (no images/media)

**Planned Enhancements:**
1. AI-generated questions from documents
2. Spaced repetition learning system
3. Progress tracking and gamification
4. Mobile app (React Native)
5. Document version control
6. Collaborative knowledge bases (team feature)
