# Question Library Feature

## Overview

This feature adds a **Question Library** system that allows admins to:
1. **Approve and save** generated questions to a reusable library
2. **Choose between** generating new questions or selecting from saved questions
3. **Track usage** of questions across multiple assessments
4. **Organize questions** by topic and difficulty level

---

## What Was Implemented

### 1. Database Schema (`supabase/migrations/013_question_library.sql`)

Created a new `question_library` table with:
- `user_id` - Admin who owns the question
- `topic_id` - Associated topic/folder from Knowledge Base
- Question fields: `question_text`, `question_type`, `options`, `correct_answer`, etc.
- `usage_count` - Tracks how many times a question has been used
- `is_active` - Soft delete flag
- Full RLS policies for security

### 2. API Endpoints (`app/api/question-library/route.ts`)

**GET `/api/question-library`** - Fetch questions from library
- Query params: `topic_ids`, `difficulty`, `active_only`
- Returns questions with topic information

**POST `/api/question-library`** - Save approved questions
- Accepts single question or array of questions
- Automatically adds `user_id`

**DELETE `/api/question-library`** - Remove questions
- Supports soft delete (`?soft=true`) or hard delete
- Query param: `?id=<question_id>`

### 3. TypeScript Types (`lib/types/assessments.ts`)

Added interfaces:
- `QuestionLibrary` - Library question with metadata
- `CreateQuestionLibraryInput` - For creating new library questions

### 4. UI Components

#### Assessment Wizard - Step 3 (Review)

**Two Modes:**
- **Generate New** - AI generates questions from documents
- **Use From Library** - Browse and select saved questions

**Features:**
- ✅ Question approval with checkboxes
- ✅ "Save to Library" button for approved questions
- ✅ Progress tracking during generation
- ✅ Topic-by-topic status indicators
- ✅ Detailed question preview with options and explanations
- ✅ Select/deselect all functionality
- ✅ Visual feedback for selected questions

---

## How It Works

### Workflow 1: Generate & Save Questions

1. Admin selects topics in Step 1
2. Admin selects employee in Step 2
3. In Step 3, admin clicks **"Generate New"** tab
4. Clicks **"Generate Questions"** button
5. Progress bar shows generation for each topic
6. Generated questions appear with checkboxes (all selected by default)
7. Admin can deselect unwanted questions
8. Clicks **"Save X to Library"** to save approved questions
9. Questions are stored in `question_library` table with topic associations
10. Admin proceeds to create assessment with selected questions

### Workflow 2: Use Saved Questions

1. Admin selects topics in Step 1
2. Admin selects employee in Step 2
3. In Step 3, admin clicks **"Use From Library"** tab
4. System automatically loads questions matching:
   - Selected topic IDs
   - Selected difficulty level
5. Admin browses saved questions with details:
   - Question text
   - Question type (multiple choice, true/false, open-ended)
   - Topic name
   - Points and difficulty
   - Usage count (how many times used before)
   - Options preview for multiple choice
6. Admin selects desired questions using checkboxes
7. Clicks **"Create Assessment"** with selected library questions

---

## Database Migration

To apply the new database schema:

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd /Users/eimantaskudarauskas/Documents/primes-teaching-agent

# Push migration to Supabase
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/013_question_library.sql`
4. Paste and execute the SQL

---

## UI Features

### Question Approval Interface

- **Checkbox selection** - Each generated question has a checkbox
- **Select/Deselect All** - Quick toggle for all questions
- **Visual feedback** - Selected questions highlighted with orange border
- **Question preview** - Shows full question details:
  - Question text
  - Type badge (color-coded)
  - Topic name
  - Points and difficulty
  - Multiple choice options (with correct answer marked)
  - Explanation text

### Mode Switcher

Clean tab interface:
- **Generate New** - Sparkles icon, generates AI questions
- **Use From Library** - Book icon, browses saved questions

### Progress Tracking (Generate Mode)

- Overall progress bar (X of Y topics)
- Current topic being processed
- Topic status list:
  - ✅ Green checkmark - Completed
  - ❌ Red X - Error
  - 🔄 Spinning loader - In progress
  - ⚪ Gray circle - Pending

### Library Browser (Library Mode)

- **Refresh Library** button - Reload questions
- **Question cards** - Interactive, click to select
- **Usage count** - Shows how many times used
- **Empty state** - Helpful message when no questions found

---

## Benefits

1. **Time Saving** - Reuse well-crafted questions across multiple assessments
2. **Consistency** - Maintain quality standards with approved questions
3. **Flexibility** - Mix generated and library questions as needed
4. **Tracking** - Know which questions are most commonly used
5. **Organization** - Questions automatically organized by topic
6. **Quality Control** - Review and approve before saving

---

## Future Enhancements (Optional)

- Edit saved questions
- Duplicate questions to modify slightly
- Question tags/categories
- Search and filter library
- Bulk import/export questions
- Question performance analytics
- Question difficulty rating based on employee scores

---

## Technical Notes

- **Streaming API** - Question generation uses Server-Sent Events (SSE) for real-time progress
- **RLS Policies** - Questions are isolated per user (admin)
- **Soft Delete** - Questions can be deactivated without deletion
- **Usage Tracking** - Automatically increments when used in assessments
- **Type Safety** - Full TypeScript support throughout
