# Phase 1 Execution Task List

This checklist operationalizes **Phase 1 - Recording + Transcript Correction Workflow** from `MVP_PHASED_IMPLEMENTATION_PLAN.md`.

## Phase 1 Goal

Enable this end-to-end flow for admins:
1. Record voice note
2. Transcribe with Whisper
3. Edit transcript
4. Save corrected transcript as canonical content
5. Re-generate embeddings for updated content

---

## Scope In / Scope Out

### In Scope
- Recording flow improvements
- Transcript edit/save UI
- Canonical transcript update behavior
- Embedding regeneration trigger after save
- Error handling and user feedback for this flow

### Out of Scope
- Direct MP3/M4A/WAV file upload
- Employee chatbot
- Question generation workflow
- i18n rollout

---

## Implementation Sequence

## 1) Data + API Contract Alignment

- [ ] Confirm existing data model fields used for recorded documents:
  - `original transcription` (if retained)
  - `current/canonical transcription`
  - processing state (transcribing, saving, embedding, failed)
- [ ] Decide whether to:
  - keep one `content` field as canonical text, and
  - optionally store `raw_transcription` metadata
- [ ] Define update API/server action contract for transcript edits:
  - input: `documentId`, `editedText`
  - output: success/error + updated document payload

### Notes
- Keep storage path/audio file unchanged when only text is edited.
- Ensure update path is idempotent (same text save should not break flow).

---

## 2) UI: Transcript Editing State

- [ ] Locate voice recording area and where transcription result is currently rendered.
- [ ] Add editable transcript UI for newly transcribed recording:
  - textarea/editor field
  - character counter (optional)
  - clear action buttons
- [ ] Add action controls:
  - `Save transcript`
  - `Cancel edits`
  - `Re-transcribe` (optional for MVP; include only if low effort)
- [ ] Add dirty-state detection:
  - disable `Save` when no changes
  - warn user if they try to leave with unsaved edits (optional)

### UX Requirements
- Loading state during save.
- Success toast/message on save.
- Error toast/message with retry on failure.

---

## 3) Save Flow + Canonical Content Update

- [ ] Implement transcript save handler (client).
- [ ] Implement server update endpoint/action for transcript text.
- [ ] Ensure save updates **existing** document content (no duplicate document creation).
- [ ] Preserve immutable audio metadata/file reference.

### Guardrails
- Trim and validate empty transcript edge cases.
- Prevent save while transcription still pending.
- Handle stale document state (if user edits after background updates).

---

## 4) Embeddings Reprocessing on Transcript Save

- [ ] Trigger embedding regeneration after successful transcript update.
- [ ] Reuse existing embeddings pipeline if available.
- [ ] Ensure old embeddings for this document are replaced/invalidated correctly.
- [ ] Reflect processing state in UI:
  - `Saving transcript...`
  - `Updating knowledge index...`
  - `Ready`

### Reliability Checks
- Avoid double-trigger on repeated clicks.
- Ensure failed embedding updates surface clear status and retry path.

---

## 5) Error Handling + Observability

- [ ] Normalize user-facing errors for:
  - transcription failure
  - transcript save failure
  - embeddings regeneration failure
- [ ] Add structured logs on server side for each stage.
- [ ] Confirm sensitive data is not logged.

### Minimum Logging Context
- organization/project/document IDs
- stage (`transcribe`, `save_transcript`, `reembed`)
- success/failure reason

---

## 6) Manual QA Checklist (Phase 1 Exit)

- [ ] Record a new voice note and receive transcription.
- [ ] Edit transcript and save.
- [ ] Refresh page; edited transcript persists.
- [ ] Ask a related question in chat; answer reflects edited transcript content.
- [ ] Verify no duplicate document was created.
- [ ] Simulate failure (invalid API key or forced error) and confirm user sees actionable error.
- [ ] Save unchanged transcript and confirm safe behavior (no breakage).

---

## 7) Regression Checklist

- [ ] Existing document upload flows still work.
- [ ] Existing chat flow still returns grounded answers.
- [ ] Existing document list rendering remains stable.
- [ ] Existing processing indicators do not regress.

---

## 8) Suggested Task Breakdown (PR-sized)

### PR 1 - UI state + editable transcript component
- Add editable transcript panel and local state handling.
- Add save/cancel controls and loading/disabled states.

### PR 2 - Backend save endpoint/action + persistence
- Add transcript update path and validation.
- Ensure canonical content update semantics.

### PR 3 - Embedding regeneration integration
- Trigger re-embedding on saved transcript.
- Add status updates and retry/error surfacing.

### PR 4 - QA + docs
- Run manual test checklist.
- Document final behavior and limitations in project docs.

---

## 9) File-Level Starting Points (Likely)

Use these as first inspection targets when implementing:
- `app/project/[id]/page.tsx` (recording/transcription UI and handlers)
- `app/actions.ts` (transcription server action)
- `app/api/embeddings/process/route.ts` (embedding processing trigger/path)
- `lib/embeddings/processor.ts` (chunking/embedding logic)
- Any document update API route currently used by project pages

---

## 10) Phase 1 Completion Criteria (Must Meet All)

- [ ] Transcript editing is available immediately after transcription.
- [ ] Saving edits updates the same recorded document content.
- [ ] Embeddings are re-generated from edited transcript.
- [ ] Edited content is reflected in retrieval/chat behavior.
- [ ] No new regressions in existing knowledge/document workflows.

