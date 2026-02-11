-- ============================================
-- MULTI-TENANT PLATFORM MIGRATION
-- Migration: 014_multi_tenant_platform.sql
-- Description: Transform to multi-tenant SaaS with organizations, invites, and unified authentication
-- ============================================

-- ============================================
-- 1. CREATE ENUM TYPES
-- ============================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User status
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invite status
DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  allowed_domains TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. CREATE/EXTEND USERS TABLE
-- ============================================
-- Note: Supabase has auth.users, but we need public.users for extended profile data
-- Check if table exists, create if not, or extend if it does

DO $$ 
BEGIN
  -- Create users table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    CREATE TABLE users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      role user_role DEFAULT 'employee',
      status user_status DEFAULT 'active',
      position TEXT,
      is_active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  ELSE
    -- Table exists, add columns if they don't exist
    ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'employee';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================
-- 4. INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'employee',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status invite_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, email)
);

-- ============================================
-- 5. DROP EMPLOYEES TABLE AND RELATED (IF EXISTS)
-- ============================================
-- Note: This section handles cleanup if migrating from old schema
-- If employees table doesn't exist (fresh database), these commands do nothing

DO $$ 
BEGIN
  -- Check if employees table exists before dropping policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    -- Drop all policies
    DROP POLICY IF EXISTS "Admins can view their employees" ON employees;
    DROP POLICY IF EXISTS "Admins can insert their employees" ON employees;
    DROP POLICY IF EXISTS "Admins can update their employees" ON employees;
    DROP POLICY IF EXISTS "Admins can delete their employees" ON employees;
    DROP POLICY IF EXISTS "Admins can view self-registered employees" ON employees;
    DROP POLICY IF EXISTS "Allow employees to update their own profile" ON employees;

    -- Drop triggers
    DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;

    -- Drop the table
    DROP TABLE IF EXISTS employees CASCADE;
  END IF;
  
  -- Drop indexes (safe to run even if table doesn't exist)
  DROP INDEX IF EXISTS idx_employees_created_by;
  DROP INDEX IF EXISTS idx_employees_email;
  DROP INDEX IF EXISTS employees_email_unique;
END $$;

-- ============================================
-- 6. UPDATE EXISTING TABLES FOR MULTI-TENANCY
-- ============================================

-- Add org_id to all relevant tables
ALTER TABLE topics ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE question_banks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE assessment_types ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE question_library ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Update assessments table: Change employee_id to reference users instead (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments') THEN
    ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_employee_id_fkey;
    ALTER TABLE assessments ADD CONSTRAINT assessments_employee_id_fkey 
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update assessment_answers table: Change employee_id to reference users instead (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_answers') THEN
    ALTER TABLE assessment_answers DROP CONSTRAINT IF EXISTS assessment_answers_employee_id_fkey;
    ALTER TABLE assessment_answers ADD CONSTRAINT assessment_answers_employee_id_fkey 
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 7. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_topics_org_id ON topics(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_question_banks_org_id ON question_banks(org_id);
CREATE INDEX IF NOT EXISTS idx_assessment_types_org_id ON assessment_types(org_id);
CREATE INDEX IF NOT EXISTS idx_assessments_org_id ON assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_question_library_org_id ON question_library(org_id);

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Organizations RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON organizations;

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Org admins can update users in their organization" ON users;

-- SELECT policies: Users can view their own profile AND users in their org
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid() AND org_id IS NOT NULL)
  );

-- UPDATE policies
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Org admins can update users in their organization"
  ON users FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Invites RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Org admins can view invites for their organization" ON invites;
DROP POLICY IF EXISTS "Org admins can create invites for their organization" ON invites;
DROP POLICY IF EXISTS "Org admins can update invites for their organization" ON invites;
DROP POLICY IF EXISTS "Org admins can delete invites for their organization" ON invites;

CREATE POLICY "Org admins can view invites for their organization"
  ON invites FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can create invites for their organization"
  ON invites FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update invites for their organization"
  ON invites FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete invites for their organization"
  ON invites FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Update existing table policies for multi-tenancy

-- Topics
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'topics') THEN
    DROP POLICY IF EXISTS "Users can view own topics" ON topics;
    DROP POLICY IF EXISTS "Users can insert own topics" ON topics;
    DROP POLICY IF EXISTS "Users can update own topics" ON topics;
    DROP POLICY IF EXISTS "Users can delete own topics" ON topics;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view topics in their organization" ON topics;
DROP POLICY IF EXISTS "Org admins can insert topics in their organization" ON topics;
DROP POLICY IF EXISTS "Org admins can update topics in their organization" ON topics;
DROP POLICY IF EXISTS "Org admins can delete topics in their organization" ON topics;

CREATE POLICY "Users can view topics in their organization"
  ON topics FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Org admins can insert topics in their organization"
  ON topics FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update topics in their organization"
  ON topics FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete topics in their organization"
  ON topics FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Documents
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON documents;
    DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view documents in their organization" ON documents;
DROP POLICY IF EXISTS "Org admins can insert documents in their organization" ON documents;
DROP POLICY IF EXISTS "Org admins can update documents in their organization" ON documents;
DROP POLICY IF EXISTS "Org admins can delete documents in their organization" ON documents;

CREATE POLICY "Users can view documents in their organization"
  ON documents FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Org admins can insert documents in their organization"
  ON documents FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update documents in their organization"
  ON documents FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete documents in their organization"
  ON documents FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Document Embeddings
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_embeddings') THEN
    DROP POLICY IF EXISTS "Users can view own embeddings" ON document_embeddings;
    DROP POLICY IF EXISTS "Users can insert own embeddings" ON document_embeddings;
    DROP POLICY IF EXISTS "Users can delete own embeddings" ON document_embeddings;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view embeddings in their organization" ON document_embeddings;
DROP POLICY IF EXISTS "Org admins can insert embeddings in their organization" ON document_embeddings;
DROP POLICY IF EXISTS "Org admins can delete embeddings in their organization" ON document_embeddings;

CREATE POLICY "Users can view embeddings in their organization"
  ON document_embeddings FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE users.org_id = (SELECT org_id FROM users WHERE users.id = auth.uid())
    )
  );

CREATE POLICY "Org admins can insert embeddings in their organization"
  ON document_embeddings FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE users.org_id = (SELECT org_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    )
  );

CREATE POLICY "Org admins can delete embeddings in their organization"
  ON document_embeddings FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE users.org_id = (SELECT org_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    )
  );

-- Conversations
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
    DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
    DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
    DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view conversations in their organization" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations in their organization" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

CREATE POLICY "Users can view conversations in their organization"
  ON conversations FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can insert conversations in their organization"
  ON conversations FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (user_id = auth.uid());

-- Assessment Types
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_types') THEN
    DROP POLICY IF EXISTS "Admins can view their assessment types" ON assessment_types;
    DROP POLICY IF EXISTS "Admins can insert their assessment types" ON assessment_types;
    DROP POLICY IF EXISTS "Admins can update their assessment types" ON assessment_types;
    DROP POLICY IF EXISTS "Admins can delete their assessment types" ON assessment_types;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Org admins can insert assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Org admins can update assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Org admins can delete assessment types in their organization" ON assessment_types;

CREATE POLICY "Users can view assessment types in their organization"
  ON assessment_types FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Org admins can insert assessment types in their organization"
  ON assessment_types FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update assessment types in their organization"
  ON assessment_types FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete assessment types in their organization"
  ON assessment_types FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Assessments
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments') THEN
    DROP POLICY IF EXISTS "Admins can view their assessments" ON assessments;
    DROP POLICY IF EXISTS "Admins can insert their assessments" ON assessments;
    DROP POLICY IF EXISTS "Admins can update their assessments" ON assessments;
    DROP POLICY IF EXISTS "Admins can delete their assessments" ON assessments;
    DROP POLICY IF EXISTS "Employees can view their assessments" ON assessments;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Org admins can insert assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Org admins can update assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Employees can update their own assessments" ON assessments;
DROP POLICY IF EXISTS "Org admins can delete assessments in their organization" ON assessments;

CREATE POLICY "Users can view assessments in their organization"
  ON assessments FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
    OR employee_id = auth.uid()
  );

CREATE POLICY "Org admins can insert assessments in their organization"
  ON assessments FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update assessments in their organization"
  ON assessments FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Employees can update their own assessments"
  ON assessments FOR UPDATE
  USING (employee_id = auth.uid());

CREATE POLICY "Org admins can delete assessments in their organization"
  ON assessments FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Question Banks
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'question_banks') THEN
    DROP POLICY IF EXISTS "Users can view own question banks" ON question_banks;
    DROP POLICY IF EXISTS "Users can insert own question banks" ON question_banks;
    DROP POLICY IF EXISTS "Users can update own question banks" ON question_banks;
    DROP POLICY IF EXISTS "Users can delete own question banks" ON question_banks;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Org admins can insert question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Org admins can update question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Org admins can delete question banks in their organization" ON question_banks;

CREATE POLICY "Users can view question banks in their organization"
  ON question_banks FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Org admins can insert question banks in their organization"
  ON question_banks FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update question banks in their organization"
  ON question_banks FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete question banks in their organization"
  ON question_banks FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Question Library
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'question_library') THEN
    DROP POLICY IF EXISTS "Users can view their question library" ON question_library;
    DROP POLICY IF EXISTS "Users can insert their question library" ON question_library;
    DROP POLICY IF EXISTS "Users can update their question library" ON question_library;
    DROP POLICY IF EXISTS "Users can delete their question library" ON question_library;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view question library in their organization" ON question_library;
DROP POLICY IF EXISTS "Org admins can insert question library in their organization" ON question_library;
DROP POLICY IF EXISTS "Org admins can update question library in their organization" ON question_library;
DROP POLICY IF EXISTS "Org admins can delete question library in their organization" ON question_library;

CREATE POLICY "Users can view question library in their organization"
  ON question_library FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Org admins can insert question library in their organization"
  ON question_library FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update question library in their organization"
  ON question_library FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Org admins can delete question library in their organization"
  ON question_library FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- Function to update updated_at timestamp for organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

-- Function to expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user email matches org allowed domains
CREATE OR REPLACE FUNCTION check_domain_match(
  user_email TEXT,
  org_allowed_domains TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  user_domain TEXT;
  allowed_domain TEXT;
BEGIN
  -- Extract domain from email
  user_domain := split_part(user_email, '@', 2);
  
  -- Check if domain matches any allowed domain
  FOREACH allowed_domain IN ARRAY org_allowed_domains
  LOOP
    IF user_domain = allowed_domain THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user post-signup
-- This should be called via a trigger or edge function after Supabase Auth creates user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pending_invite RECORD;
  matching_org RECORD;
BEGIN
  -- Check if user has a pending invite
  SELECT * INTO pending_invite
  FROM invites
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- User has an invite - accept it
    UPDATE users
    SET 
      org_id = pending_invite.org_id,
      role = pending_invite.role,
      status = 'active'
    WHERE id = NEW.id;

    UPDATE invites
    SET 
      status = 'accepted',
      accepted_at = now()
    WHERE id = pending_invite.id;

    RETURN NEW;
  END IF;

  -- Check if email domain matches any org's allowed domains
  SELECT * INTO matching_org
  FROM organizations
  WHERE is_active = true
    AND check_domain_match(NEW.email, allowed_domains)
  LIMIT 1;

  IF FOUND THEN
    -- Email domain matches - create as pending user
    UPDATE users
    SET 
      org_id = matching_org.id,
      role = 'employee',
      status = 'pending'
    WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  -- No invite and no domain match - user stays without org
  -- They will see "no organization" message
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
-- Note: Database triggers on auth.users can cause issues with Supabase Auth
-- We're commenting this out and handling user creation in the auth callback instead
-- If you want to use a trigger, it's better to use a Supabase Edge Function

-- DO $$ 
-- BEGIN
--   -- Try to create trigger, but don't fail if we can't access auth.users
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- EXCEPTION WHEN OTHERS THEN
--   RAISE NOTICE 'Could not create trigger on auth.users. You may need to implement signup logic in an Edge Function or API route instead.';
-- END $$;

-- Instead, we handle user creation in /app/auth/callback/route.ts
