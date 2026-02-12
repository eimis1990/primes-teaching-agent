# Question Generation Architecture & Debugging Guide

## 🏗️ How It Works (Senior-Level Architecture)

### Data Flow

```
User selects topics → API fetches documents → Combines content → Sends to Gemini → Parses JSON → Returns questions
```

### Step-by-Step Process

#### 1. **Document Retrieval**
```typescript
// From: app/api/assessments/generate-questions/route.ts

SELECT id, title, content, topic_id 
FROM documents 
WHERE topic_id IN (selected_topics) 
  AND user_id = current_user
```

**What we store:**
- `content`: The actual document text (from uploaded PDFs, text files, etc.)
- `title`: Document name
- `topic_id`: Which topic/folder it belongs to

**What we send to AI:**
```
Document: [Title 1]

[Full content of document 1]

---

Document: [Title 2]

[Full content of document 2]

---
...
```

#### 2. **Content Preparation**
- Combines multiple documents from the same topic
- Separates with `---` dividers
- Limits to 30,000 characters (Gemini can handle this easily)
- Preserves document structure and formatting

#### 3. **AI Generation (Gemini)**
```typescript
model: "gemini-pro"  // Using stable production model
temperature: 0.7
maxOutputTokens: 8000
```

**Why Gemini Pro?**
- No restrictive token limits (unlike OpenAI's 4096)
- Faster response times
- Better at following JSON format instructions
- Free tier is generous
- Most stable Gemini model (widely available)

#### 4. **Response Parsing**
- Extracts JSON from markdown code blocks
- Validates question structure
- Ensures correct number of questions
- Maps to our database schema

---

## 🔍 Current Issues & Solutions

### Issue 1: Employee Loading (404 Error)

**Problem:**
Employee exists but API returns 404.

**Root Cause:**
Employee might belong to a different admin user.

**Debug Logs Added:**
```
🔍 GET /api/employees/[id]
👤 Current user: [user_id]
📋 Employee found: { created_by, matches_user }
```

**What to check:**
1. Is `created_by` === current `user.id`?
2. Did you log in as the correct admin?
3. Was employee created by a different admin account?

### Issue 2: Question Generation Fails

**Potential Root Causes:**

#### A. No Documents in Topic
```
❌ No documents found for topics: [...]
```
**Solution:** Upload documents to your Knowledge Base

#### B. Empty Document Content
```
⚠️ Very short content (50 chars) - might not be enough
```
**Solution:** Ensure documents have substantial content

#### C. Gemini API Error
```
❌ Gemini API Error: [error message]
```
**Solution:** Check GEMINI_API_KEY in .env.local

#### D. JSON Parsing Failed
```
❌ Error parsing AI response
```
**Solution:** AI returned invalid JSON - check logs for raw response

---

## 📊 What Gets Logged Now

### Question Generation Logs

**Stage 1: Document Fetching**
```
🔍 Fetching documents for topics: ['abc-123']
👤 User ID: xyz-789
📄 Raw documents response: { count: 5, hasData: true }
📚 Found 5 documents across 1 topics
  1. "Company Policy.pdf" (Topic: abc-123)
     Content: 8234 chars - "This document outlines..."
  2. "Employee Handbook.pdf" (Topic: abc-123)
     Content: 12045 chars - "Welcome to our company..."
```

**Stage 2: Content Preparation**
```
📖 Processing topic: Company Policies (5 documents)
   📝 Combined content length: 20045 characters
   📋 Content preview: "Document: Company Policy.pdf..."
```

**Stage 3: AI Generation**
```
🎯 Generating 4 questions for topic abc-123 at medium difficulty...
📄 Content length: 20045 characters
🤖 Calling Gemini API...
📝 Raw AI response length: 2341 characters
📋 Raw response preview:
{
  "questions": [
    {
      "question_text": "What is...",
```

**Stage 4: Parsing**
```
✂️ Extracted JSON from markdown block
📦 Parsed response keys: ['questions']
✅ Successfully extracted 4 questions (expected: 4)
  1. multiple_choice: What is the company's policy on...
  2. open_ended: Explain the process for...
  3. true_false: The company allows remote work...
  4. multiple_choice: Which of the following...
```

---

## 🧪 Testing Checklist

### Before Generation:
- [ ] Documents uploaded to selected topic(s)
- [ ] Documents have actual content (not empty)
- [ ] Content is relevant text (not just images)
- [ ] GEMINI_API_KEY is set in .env.local
- [ ] User is logged in correctly

### During Generation:
- [ ] Check terminal for logs starting with 🔍 📚 🎯
- [ ] Verify document count is > 0
- [ ] Verify content length is > 100 characters
- [ ] Watch for ❌ error symbols

### Expected Success Pattern:
```
📚 Found X documents
📖 Processing topic: YourTopic (X documents)
📝 Combined content length: XXXX characters
🎯 Generating X questions...
🤖 Calling Gemini API...
📝 Raw AI response length: XXXX characters
✅ Successfully extracted X questions (expected: X)
```

---

## 🔧 Troubleshooting

### Problem: "No documents found"
1. Go to Knowledge Base
2. Select the topic you're trying to use
3. Verify documents are there
4. Check document status (uploaded vs. processing)
5. Try uploading a new test document

### Problem: "Failed to generate questions"
1. Check terminal for ❌ symbols
2. Look for the exact error message
3. Check if it's:
   - API key issue → Update .env.local
   - Content issue → Check document content
   - Parsing issue → AI returned bad format (report with logs)

### Problem: "Employee not found (404)"
1. Check terminal logs for employee debug info
2. Verify `created_by` matches your user ID
3. If mismatch, you might be logged in as wrong user
4. Check if employee was created by different admin

---

## 🎯 Best Practices (Senior Engineer Level)

### 1. Document Quality
- Each document should be 500+ words for good questions
- Use clear, structured content
- Avoid image-heavy PDFs without OCR

### 2. Content Organization
- Group related documents in the same topic
- Each topic should have 2-5 documents minimum
- Don't mix unrelated content in same topic

### 3. Question Generation
- Start with 2-3 questions per topic for testing
- Increase to 5-10 once you verify quality
- Review generated questions before saving

### 4. Error Handling
- Always check terminal logs first
- Copy full error messages when reporting issues
- Test with one topic at a time initially

### 5. Performance
- Generation takes ~5-15 seconds per topic
- Multiple topics process sequentially (not parallel)
- Expect 2-3 questions per 1000 words of content

---

## 📝 Next Steps to Debug

1. **Restart dev server**
   ```bash
   npm run dev
   ```

2. **Try generation with ONE topic**
   - Select just 1 topic
   - Set 2 questions per topic
   - Watch terminal logs

3. **Copy ALL terminal output**
   - From "🔍 Fetching documents..."
   - Through "✅ Successfully extracted..."
   - Or any ❌ errors

4. **Share logs** so we can see exactly what's happening

---

## 🚀 Expected Behavior

**For 2 topics, 4 questions each:**
- Should generate 8 total questions (4 per topic)
- Takes ~20-30 seconds
- You see progress for each topic
- Get success toast for each completed topic
- Final result: 8 questions displayed with checkboxes

**For single topic, 4 questions:**
- Should generate exactly 4 questions
- Takes ~10-15 seconds
- All questions from that topic's documents
- Mix of multiple choice, true/false, open-ended
