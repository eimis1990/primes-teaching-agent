# MVP Phased Implementation Plan (Missing + Incomplete Functionality)

This plan turns the gap analysis into an execution roadmap we can follow together.

## Decisions Locked In

- AI strategy: **Gemini-first** for all new AI functionality.
- Exception: **OpenAI Whisper** remains for voice transcription (recording -> text).
- Planning style: **Phases / milestones** (no date commitments in this document).
- MVP languages: **English + Ukrainian**.
- Employee chatbot: **included in MVP, implemented in Phase 2**.
- Questions: support **manual creation** and **AI-generated questions**, with generated questions **editable + confirm-before-save**.
- Voice ingestion: **recording only** (no direct MP3/M4A/WAV upload for now).
- Transcription flow: user can **edit transcript**; edited text becomes the canonical stored content of that recording.
- No hard KPI gates required for MVP.

---

## Target Outcomes by End of MVP

1. Admin can record voice knowledge, receive transcription, edit transcript, and save corrected content.
2. Admin can generate questions with Gemini, review/edit/confirm each, and save only confirmed ones to DB.
3. Assessment creation uses a single source of truth: **database “Available Questions” only** (no duplicate generated list during assessment setup).
4. Employee chatbot is functional and role-safe (not placeholder), using existing RAG patterns.
5. English/Ukrainian UI switching works for key user journeys.

---

## Phase 0 - Foundation Alignment (Short Setup Phase)

### Goal
Remove ambiguity before feature work starts.

### Tasks
- Define final AI provider map in docs:
  - Gemini: generation/grading/chat/question creation.
  - OpenAI Whisper: transcription only.
- Create/refresh architecture note for this rule so future work does not reintroduce mixed provider usage accidentally.
- Confirm schema entities and naming for:
  - recordings + transcriptions
  - generated question drafts
  - confirmed/persisted questions

### Deliverables
- One short architecture decision record (`ADR` style) documenting provider boundaries.
- Updated implementation notes with the planned question lifecycle.

---

## Phase 1 - Recording + Transcript Correction Workflow

### Goal
Make voice ingestion production-usable for MVP without audio file upload complexity.

### Functional Scope
- Keep recording as primary ingestion path.
- Keep OpenAI Whisper transcription.
- Add transcript editing UX and save flow.
- Persist corrected transcript as final content for retrieval/embeddings.

### Implementation Steps
1. **Data model readiness**
   - Ensure recording record tracks:
     - original transcription
     - edited transcription (or final canonical text)
     - transcription status + error metadata
2. **UI/UX update**
   - After transcription, show editable text area in context of the recording.
   - Clear actions: `Save transcript`, `Re-transcribe` (optional), `Cancel edits`.
3. **Save behavior**
   - Saving transcript updates the existing document/recording content (not a new duplicate document).
   - Audio blob remains unchanged; text content is updated.
4. **Embeddings refresh**
   - On transcript update, re-run chunking/embedding for that content.
5. **Error handling**
   - Add user-friendly failure messages for transcription/save/re-embedding errors.

### Definition of Done
- Admin can record, transcribe, edit text, save.
- Saved edited text is used in chat/knowledge retrieval.
- No duplicate documents created when transcript is edited.

---

## Phase 2 - Employee Chatbot MVP (Included in MVP)

### Goal
Replace placeholder employee chatbot page with real assistant functionality.

### Functional Scope
- Employee role can access chatbot.
- Responses use existing grounded RAG constraints.
- Scope content by organization/allowed topics.

### Implementation Steps
1. **Route enablement**
   - Replace placeholder page with real chat UI.
2. **Role/permission checks**
   - Ensure only employee-authorized data is retrievable.
3. **Chat backend integration**
   - Reuse or extend existing chat API for employee context.
4. **Conversation behavior**
   - Keep citation/grounding rules consistent with admin chat.
5. **Basic UX polish**
   - Empty state, loading state, retry button.

### Definition of Done
- Employee can ask training-related questions and receive grounded answers.
- Placeholder messaging is fully removed.
- Access control is verified for employee role boundaries.

---

## Phase 3 - Gemini Question Generation with Human Confirmation

### Goal
Create a reliable assisted-authoring workflow for questions that keeps human control.

### Functional Scope
- Manual questions remain supported.
- Gemini generates question candidates.
- Admin reviews/edits/confirms each generated question before save.
- Only confirmed questions are persisted as regular questions.

### UX Workflow (Required)
1. Admin triggers `Generate Questions` (Gemini).
2. Generated items appear in a side panel/drawer list.
3. Each item supports:
   - edit
   - approve/confirm
   - reject/discard
4. Admin clicks `Continue`/`Save Confirmed`.
5. System stores confirmed items in DB as normal questions.
6. Assessment builder shows one unified list: **Available Questions (from DB only)**.

### Implementation Steps
1. **Question generation service**
   - Gemini prompt + response parser for question schema.
2. **Draft state management**
   - Maintain generated drafts in UI state until confirmation.
3. **Review panel component**
   - Side panel with per-question controls (edit/confirm/reject).
4. **Persistence endpoint**
   - Save only confirmed questions to DB.
5. **Assessment creation update**
   - Remove split between generated vs DB lists; use DB list only.
6. **Manual + generated coexistence**
   - Manual creation stays unchanged and writes to same question table.

### Definition of Done
- Admin can generate, edit, confirm, and save selected questions.
- Assessment creation consumes one consolidated “Available Questions” source.
- No duplicate display logic for generated vs stored questions.

---

## Phase 4 - i18n (English + Ukrainian) for MVP Journeys

### Goal
Provide bilingual UI in critical paths without full-platform translation overhead.

### MVP Localization Scope
- Navigation and core shell labels.
- Recording + transcription editing flow.
- Question generation/review flow.
- Assessment creation core labels.
- Employee chatbot primary UI strings.

### Implementation Steps
1. **i18n foundation**
   - Introduce translation dictionaries for `en` and `uk`.
   - Add locale switch in user settings or top-level UI.
2. **String externalization**
   - Move hardcoded UI strings from scoped MVP screens into translation keys.
3. **Locale persistence**
   - Save selected locale per user/session.
4. **Fallback behavior**
   - Default to English when translation key missing.

### Definition of Done
- User can switch between English and Ukrainian.
- Scoped MVP screens render localized text consistently.

---

## Phase 5 - Final MVP Consolidation and Handover

### Goal
Stabilize, verify flows, and prepare deployment/handover clarity.

### Tasks
- End-to-end manual QA of these flows:
  - Record -> transcribe -> edit -> save -> ask chatbot.
  - Generate questions -> review/edit/confirm -> assessment creation from DB list.
  - Employee chatbot usage.
  - Language switching in scoped MVP screens.
- Fix blocking regressions.
- Update docs:
  - final architecture map
  - admin usage guide for new question workflow
  - known limitations list

### Definition of Done
- All phase deliverables work together in one integrated path.
- Documentation reflects actual shipped behavior.

---

## Technical Guardrails (Apply Across All Phases)

- Keep provider boundaries strict:
  - Gemini for generation/evaluation/chat features.
  - Whisper (OpenAI) only for transcription.
- Do not create parallel question sources in UI after confirmation flow is in place.
- Preserve existing role-based access model; add checks when extending routes/APIs.
- Prefer incremental migrations; avoid breaking existing assessments data.

---

## Suggested Work Order (Execution Sequence)

1. Phase 0 (alignment)
2. Phase 1 (transcription correction)
3. Phase 3 (question generation + confirmation workflow)
4. Phase 2 (employee chatbot)
5. Phase 4 (i18n EN/UK)
6. Phase 5 (consolidation)

Rationale:
- Phase 1 + 3 reduce core content quality risk early.
- Chatbot can then consume better content/question infrastructure.
- i18n is applied once key screens are stable.

---

## Collaboration Checklist (How We Follow This Together)

For each phase:
1. Confirm scope boundaries (what is in/out for that phase).
2. Implement in small PR-sized chunks.
3. Run manual test script for affected flows.
4. Update docs immediately after behavior changes.
5. Mark phase complete only after demo walkthrough.

