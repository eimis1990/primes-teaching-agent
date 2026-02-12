# Phase 2 Execution Task List

This checklist operationalizes **Phase 2 - ElevenLabs Topic Widget + Topic KB Sync**.

## Phase 2 Goal

Show an ElevenLabs widget inside each Knowledge Base topic/folder and ensure that topic documents are synced to ElevenLabs knowledge base so the agent can focus on that topic context.

---

## Scope In / Scope Out

### In Scope
- Add ElevenLabs widget UI to each topic folder page.
- Add backend API to sync topic documents into ElevenLabs knowledge base.
- Persist sync metadata so unchanged documents are not re-uploaded.
- Keep org/admin permission checks for sync endpoint.
- Pass topic context into widget runtime configuration.

### Out of Scope
- Full employee chatbot replacement (separate track).
- Per-topic separate ElevenLabs agents.
- i18n for widget area.
- Deep analytics around widget usage quality.

---

## Implementation Sequence

## 1) Current Flow Mapping

- [x] Audit current ElevenLabs integration points (`lib/voice`, `/api/voice/session`, widget usage).
- [x] Audit topic/folder page integration points.
- [x] Confirm where topic documents are stored and retrieved.
- [x] Confirm there was no existing ElevenLabs widget embed in project.

---

## 2) Data + Persistence

- [x] Create DB table for topic/document -> ElevenLabs document mapping.
- [x] Add migration with indexes and RLS policies.
- [x] Track sync hash for change detection.

### Notes
- Table added: `elevenlabs_topic_documents`
- Migration added: `supabase/migrations/018_elevenlabs_topic_sync.sql`

---

## 3) Topic Sync API + Permission Safety

- [x] Add authenticated sync endpoint: `POST /api/voice/sync-topic`.
- [x] Add sync status endpoint: `GET /api/voice/sync-topic?topicId=...`.
- [x] Restrict sync endpoint to org admins.
- [x] Restrict topic/document selection to requesting user's organization.
- [x] Skip unchanged docs via content hash.
- [x] Upload changed topic docs to ElevenLabs knowledge base and persist mapping.
- [x] Re-attach current topic knowledge to shared agent when topic changes (without re-uploading unchanged docs).

### Guardrails
- [x] Do not trust client-only topic context.
- [x] Verify org scope server-side before syncing.

---

## 4) Widget Integration on Folder Page

- [x] Add automatic first sync attempt when topic has documents.
- [x] Remove manual sync requirement for users.
- [x] Show "Synced" badge inline near topic title after successful background sync.
- [x] Hide voice-assistant UI when background sync fails.
- [x] Keep sync running in background with no extra panel shown.
- [x] Avoid full sync on every topic open by checking sync status first.
- [x] Apply stricter runtime widget overrides from app code.

---

## 5) UX States + Error Handling

- [x] Add loading state for sync action.
- [x] Add success summary after sync.
- [x] Add error state for sync failures.
- [x] Add empty-state warning when topic has no documents.
- [ ] Add retry helper action for specific per-document failures (future pass).

---

## 6) Manual QA Checklist (Phase 2 Exit)

- [ ] Open a topic page and confirm widget renders.
- [ ] Run topic sync and confirm success summary appears.
- [ ] Verify unchanged docs are skipped on second sync.
- [ ] Verify changed document content triggers re-upload on next sync.
- [ ] Verify non-admin user cannot call sync endpoint (403).
- [ ] Verify cross-org topic sync is blocked by org checks.
- [ ] Validate agent behavior is topic-focused in practical conversation.

---

## 7) Regression Checklist

- [ ] Existing topic document upload/transcription still works.
- [ ] Existing project text chat flow remains stable.
- [ ] Existing embedding processing flow remains stable.
- [ ] No regressions in knowledge base navigation and topic pages.

---

## 8) Suggested Task Breakdown (PR-sized)

### PR 1 - Backend sync foundation
- Migration + hash utility + ElevenLabs upload helper.
- Topic sync API endpoint with org/admin checks.

### PR 2 - Widget UI integration
- Topic widget component.
- Folder page integration and sync controls.

### PR 3 - Hardening + QA
- Better failure granularity, retries, and docs.
- Execute manual QA + regression checklist.

---

## 9) File-Level Starting Points (Implemented)

- `supabase/migrations/018_elevenlabs_topic_sync.sql`
- `lib/voice/elevenlabs-knowledge.ts`
- `app/api/voice/sync-topic/route.ts`
- `components/voice/elevenlabs-topic-widget.tsx`
- `app/project/[id]/page.tsx`

---

## 10) Phase 2 Completion Criteria (Must Meet All)

- [x] Widget is embedded in each topic folder page.
- [x] Topic docs can be synced to ElevenLabs KB through backend route.
- [x] Sync state is persisted and unchanged docs are skipped.
- [x] Sync route enforces org + admin constraints.
- [ ] Topic-only answering is validated in real conversation testing.
- [ ] No regressions in existing topic/document workflows.

