-- ============================================
-- ELEVENLABS TOPIC KNOWLEDGE SYNC
-- Migration: 018_elevenlabs_topic_sync.sql
-- ============================================

CREATE TABLE IF NOT EXISTS elevenlabs_topic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  agent_id TEXT NOT NULL,
  elevenlabs_document_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_elevenlabs_topic_documents_org_id
  ON elevenlabs_topic_documents(org_id);

CREATE INDEX IF NOT EXISTS idx_elevenlabs_topic_documents_topic_id
  ON elevenlabs_topic_documents(topic_id);

CREATE INDEX IF NOT EXISTS idx_elevenlabs_topic_documents_document_id
  ON elevenlabs_topic_documents(document_id);

ALTER TABLE elevenlabs_topic_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view synced ElevenLabs docs in their organization" ON elevenlabs_topic_documents;
DROP POLICY IF EXISTS "Org admins can insert synced ElevenLabs docs in their organization" ON elevenlabs_topic_documents;
DROP POLICY IF EXISTS "Org admins can update synced ElevenLabs docs in their organization" ON elevenlabs_topic_documents;
DROP POLICY IF EXISTS "Org admins can delete synced ElevenLabs docs in their organization" ON elevenlabs_topic_documents;

CREATE POLICY "Users can view synced ElevenLabs docs in their organization"
  ON elevenlabs_topic_documents FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Org admins can insert synced ElevenLabs docs in their organization"
  ON elevenlabs_topic_documents FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update synced ElevenLabs docs in their organization"
  ON elevenlabs_topic_documents FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete synced ElevenLabs docs in their organization"
  ON elevenlabs_topic_documents FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
