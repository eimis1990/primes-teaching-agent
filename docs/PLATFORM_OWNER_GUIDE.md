# Platform Owner Guide - Organization Management

## 📖 Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Platform Owner Dashboard](#platform-owner-dashboard)
- [Creating Organizations](#creating-organizations)
- [Organization Details & Management](#organization-details--management)
- [Security & Access Control](#security--access-control)
- [Technical Architecture](#technical-architecture)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Platform Owner panel allows you (the platform owner) to manage all organizations on the platform. This is the highest level of access in the multi-tenant system.

### User Hierarchy
```
Platform Owner (you)
    ↓
Organization Admins (per organization)
    ↓
Employees (per organization)
```

### What You Can Do
- ✅ Create unlimited organizations
- ✅ View all organizations and their stats
- ✅ Edit organization settings
- ✅ Configure allowed email domains
- ✅ Delete organizations
- ✅ Invite admins to organizations
- ✅ Manage users and roles
- ✅ View organization-level analytics
- 🔜 Manage users across organizations (coming soon)

---

## Getting Started

### Prerequisites
1. **Platform owner email configured** in `.env.local`:
   ```bash
   PLATFORM_OWNER_EMAIL=e.kudarauskas@gmail.com
   NEXT_PUBLIC_PLATFORM_OWNER_EMAIL=e.kudarauskas@gmail.com
   ```

2. **Database migrations applied**:
   - `014_multi_tenant_platform.sql` ✅
   - `015_fix_infinite_recursion.sql` ✅

### First Time Access

1. **Sign in** at `/login` with your Google account (must match `PLATFORM_OWNER_EMAIL`)
2. You'll be automatically redirected to `/platform-owner`
3. Start creating organizations!

---

## Platform Owner Dashboard

**URL:** `/platform-owner`

### Dashboard Overview

The dashboard shows:

#### Stats Cards (Top Section)
- **Total Organizations** - Number of organizations on the platform
- **Total Users** - Combined users across all organizations
- **Active Admins** - Number of organization administrators

#### Organizations List
- View all organizations
- Click any organization to view/edit details
- Shows organization name and slug
- Empty state with "Create Organization" CTA when no orgs exist

#### Quick Actions
- Create New Organization
- Platform Settings (coming soon)
- Sign Out

### What Each Organization Shows
```
🏢 Acme Corporation
   /acme-corp
   → Click to view details
```

---

## Creating Organizations

**URL:** `/platform-owner/organizations/new`

### Step-by-Step Guide

#### 1. Access Creation Page
- Click "New Organization" button from dashboard header
- Or click "Create Organization" from empty state

#### 2. Fill Organization Details

**Organization Name** (Required)
- Full name of the organization
- Example: `Acme Corporation`, `TechStartup Inc`
- Used in UI and communications

**URL Slug** (Required)
- Auto-generated from name (editable)
- Must be unique across all organizations
- Format: lowercase, numbers, hyphens only
- Example: `acme-corp`, `techstartup`
- Used in URLs and API calls

**Allowed Email Domains** (Optional)
- List of email domains that can auto-join this organization
- Add multiple domains
- Example: `acme.com`, `acmecorp.com`
- Users with these domains can automatically sign up

#### 3. Submit
- Click "Create Organization"
- Success toast notification appears
- Redirected back to dashboard
- New organization appears in the list

### Form Validation

#### Organization Name
- ✅ Required field
- ✅ Any text allowed
- ❌ Cannot be empty

#### URL Slug
- ✅ Required field
- ✅ Must be unique
- ✅ Lowercase only
- ✅ Letters, numbers, hyphens only
- ❌ No spaces or special characters
- ❌ Cannot duplicate existing slug

#### Allowed Domains
- ✅ Optional
- ✅ Valid domain format required (e.g., `example.com`)
- ✅ Multiple domains allowed
- ❌ Duplicate domains rejected
- ❌ Invalid formats rejected

### Example Organization

```
Name: Acme Corporation
Slug: acme-corp
Domains: 
  - acme.com
  - acmecorp.com
```

**Result:**
- Organization created ✅
- Available at `/platform-owner/organizations/{uuid}`
- Users with `@acme.com` or `@acmecorp.com` emails can auto-join

---

## Organization Details & Management

**URL:** `/platform-owner/organizations/[id]`

### Access Details Page
- Click any organization from the dashboard
- Or navigate directly via organization ID

### Page Sections
1. **Stats Overview** - Users, admins, status
2. **Organization Settings** - Name, slug, domains
3. **Invite Admin** - Send invitations ✨ NEW
4. **Users & Admins** - Manage team ✨ NEW

### What You Can See

#### Stats Overview (Top Cards)
```
┌─────────────────┬─────────────────┬─────────────────┐
│  Total Users    │     Admins      │     Status      │
│       12        │        3        │     Active      │
└─────────────────┴─────────────────┴─────────────────┘
```

- **Total Users** - All users in this organization
- **Admins** - Users with admin role
- **Status** - Active or Inactive

#### Organization Settings Form

**Editable Fields:**
1. **Organization Name** - Update organization name
2. **URL Slug** - Change the slug (must remain unique)
3. **Allowed Email Domains** - Add/remove domains

**Actions:**
- **Save Changes** - Update organization settings
- **Delete** (top right) - Permanently delete organization

### Editing Organizations

#### Update Name or Slug
1. Edit the text field
2. Click "Save Changes"
3. Success toast appears
4. Changes saved immediately

#### Manage Allowed Domains

**Add a Domain:**
1. Type domain in input field (e.g., `newdomain.com`)
2. Press Enter or click + button
3. Domain added to list with ✓ checkmark

**Remove a Domain:**
1. Click X button next to domain
2. Domain removed from list
3. Click "Save Changes" to persist

#### Save Changes
- All changes saved together
- Validation runs before saving
- Success/error toast notification
- Page refreshes with new data

### Managing Admins & Users

#### Invite Admin

**Why it's important:** Organizations need at least one admin to function!

**How to invite:**
1. Scroll to **"Invite Admin"** section
2. Enter email address
3. Select role (Admin or Employee)
4. Click **"Send Invite"**
5. User will be added when they sign in

**Pending Invites:**
- Shows all pending invitations
- Displays expiration date (7 days)
- Can cancel invites before acceptance

#### Users & Admins List

**View all users:**
- See everyone in the organization
- Shows role, status, and position
- Color-coded by role (purple = admin, blue = employee)

**Promote/Demote Users:**
- **Promote** employee to admin
- **Demote** admin to employee
- Real-time stats update
- One-click role changes

**User Information:**
- Email and full name
- Current role
- Status (active, pending, suspended)
- Position (if set)

📖 **Full Guide:** See `ADMIN_MANAGEMENT_GUIDE.md` for complete admin management documentation.

### Deleting Organizations

⚠️ **Warning:** This action is permanent and cannot be undone!

#### Delete Process
1. Click "Delete" button (red, top right)
2. Confirmation dialog appears
3. Dialog warns about data loss:
   - All users will be removed
   - All assessments deleted
   - All documents deleted
   - All conversations deleted
   - All data CASCADE deleted
4. Click "Delete Organization" to confirm
5. Organization permanently deleted
6. Redirected to dashboard

#### What Gets Deleted
- ❌ Organization record
- ❌ All users in organization (`CASCADE`)
- ❌ All topics (`CASCADE`)
- ❌ All documents (`CASCADE`)
- ❌ All assessments (`CASCADE`)
- ❌ All conversations (`CASCADE`)
- ❌ All question banks (`CASCADE`)
- ❌ All invites (`CASCADE`)

---

## Security & Access Control

### Authentication Flow

```
User signs in with Google
    ↓
Check email matches PLATFORM_OWNER_EMAIL
    ↓
Yes? → Redirect to /platform-owner
No?  → Redirect to /dashboard (or appropriate page)
```

### API Security

All organization endpoints are protected:

1. **Authentication Check** - Validates user is signed in
2. **Platform Owner Check** - Validates email matches env variable
3. **Service Role Client** - Uses elevated permissions for DB operations

```typescript
// Authentication
const { user } = await supabase.auth.getUser()
if (!user) return 401 Unauthorized

// Platform Owner Check
if (user.email !== PLATFORM_OWNER_EMAIL) return 403 Forbidden

// Database Operations
const serviceSupabase = createServiceClient() // Bypasses RLS
```

### Why This is Secure

✅ **Email validation** happens before any database access  
✅ **Service client** only used after authentication  
✅ **Environment variable** not exposed to client  
✅ **RLS bypass** is safe because we validate at API level  
✅ **401 for unauthenticated** requests  
✅ **403 for non-platform owners**  

### Environment Variables

**Server-side only:**
- `PLATFORM_OWNER_EMAIL` - Platform owner email (API routes)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)

**Client & Server:**
- `NEXT_PUBLIC_PLATFORM_OWNER_EMAIL` - For client-side checks
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

---

## Technical Architecture

### File Structure

```
app/
├── api/
│   └── organizations/
│       ├── route.ts              # GET, POST
│       └── [id]/
│           └── route.ts          # GET, PATCH, DELETE
├── platform-owner/
│   ├── page.tsx                  # Dashboard
│   └── organizations/
│       ├── new/
│       │   └── page.tsx          # Create organization
│       └── [id]/
│           └── page.tsx          # Organization details/edit
└── lib/
    └── supabase/
        ├── client.ts             # Client-side Supabase
        ├── server.ts             # Server-side Supabase
        └── service.ts            # Service role client
```

### Database Schema

#### Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  allowed_domains TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Indexes
```sql
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
```

#### RLS Policies (via Service Client)
Platform owner operations bypass RLS by using service role client.  
Security validation happens at API level.

### Data Flow

#### Creating an Organization
```
Client Form Submission
    ↓
POST /api/organizations
    ↓
1. Validate user authentication
2. Check platform owner email
3. Validate form data
4. Check slug uniqueness (service client)
5. Insert organization (service client)
    ↓
Response with new organization
    ↓
Client: Toast notification + redirect to dashboard
```

#### Fetching Organizations
```
Client: useEffect on page load
    ↓
GET /api/organizations
    ↓
1. Validate authentication
2. Check platform owner
3. Fetch all organizations (service client)
4. Get user counts per org (service client)
    ↓
Response with orgs + stats
    ↓
Client: Display in dashboard
```

#### Updating an Organization
```
Client: Form submission
    ↓
PATCH /api/organizations/[id]
    ↓
1. Validate authentication
2. Check platform owner
3. Await params (Next.js 15+)
4. Validate slug if changed
5. Update organization (service client)
    ↓
Response with updated org
    ↓
Client: Toast + refresh data
```

---

## API Reference

### GET /api/organizations

**Description:** List all organizations with stats

**Authentication:** Required (Platform Owner)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "allowed_domains": ["acme.com"],
    "settings": {},
    "is_active": true,
    "created_at": "2026-02-06T...",
    "updated_at": "2026-02-06T...",
    "user_count": 12,
    "admin_count": 3
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (not signed in)
- `403` - Forbidden (not platform owner)
- `500` - Internal server error

---

### POST /api/organizations

**Description:** Create new organization

**Authentication:** Required (Platform Owner)

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "allowed_domains": ["acme.com", "acmecorp.com"],
  "settings": {}
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "allowed_domains": ["acme.com", "acmecorp.com"],
  "settings": {},
  "is_active": true,
  "created_at": "2026-02-06T...",
  "updated_at": "2026-02-06T..."
}
```

**Status Codes:**
- `201` - Created
- `400` - Bad request (validation failed)
- `401` - Unauthorized
- `403` - Forbidden
- `409` - Conflict (slug already exists)
- `500` - Internal server error

---

### GET /api/organizations/[id]

**Description:** Get organization details

**Authentication:** Required (Platform Owner)

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "allowed_domains": ["acme.com"],
  "settings": {},
  "is_active": true,
  "created_at": "2026-02-06T...",
  "updated_at": "2026-02-06T...",
  "user_count": 12,
  "admin_count": 3
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Organization not found
- `500` - Internal server error

---

### PATCH /api/organizations/[id]

**Description:** Update organization

**Authentication:** Required (Platform Owner)

**Request Body:** (all fields optional)
```json
{
  "name": "New Name",
  "slug": "new-slug",
  "allowed_domains": ["new.com"],
  "settings": {},
  "is_active": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "New Name",
  "slug": "new-slug",
  "allowed_domains": ["new.com"],
  "settings": {},
  "is_active": false,
  "created_at": "2026-02-06T...",
  "updated_at": "2026-02-06T..."
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `409` - Conflict (slug exists)
- `500` - Internal server error

---

### DELETE /api/organizations/[id]

**Description:** Delete organization (CASCADE)

**Authentication:** Required (Platform Owner)

**Response:**
```json
{
  "message": "Organization deleted successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal server error

---

## Troubleshooting

### Common Issues

#### "Forbidden - Platform owner access only"

**Cause:** Your email doesn't match `PLATFORM_OWNER_EMAIL`

**Fix:**
1. Check `.env.local` has correct email
2. Restart dev server (`npm run dev`)
3. Sign out and sign back in
4. Clear browser cookies

#### "Slug already exists"

**Cause:** Another organization has this slug

**Fix:**
1. Choose a different slug
2. Make it unique (add numbers, hyphens, etc.)
3. Check existing organizations for conflicts

#### "Invalid domain format"

**Cause:** Domain doesn't match pattern

**Fix:**
1. Use format: `example.com` (no http://, no www)
2. Must have at least one dot (.)
3. Valid TLD required (.com, .org, .edu, etc.)

#### "Failed to fetch organization"

**Cause:** Next.js 15+ params issue (now fixed)

**Fix:**
- Already fixed in code (params are now awaited)
- Refresh browser if still seeing error

#### Organization not appearing after creation

**Cause:** Cache or state issue

**Fix:**
1. Hard refresh browser (Cmd/Ctrl + Shift + R)
2. Check browser console for errors
3. Verify organization exists in Supabase dashboard

#### Can't delete organization

**Cause:** Database constraint or permission issue

**Fix:**
1. Make sure you're platform owner
2. Check browser console for specific error
3. Verify in Supabase dashboard

### Debug Mode

Check browser console for detailed error messages:
- Open DevTools (F12)
- Go to Console tab
- Look for errors in red
- Error details show API responses

### Database Checks

**Verify organizations exist:**
```sql
SELECT id, name, slug, created_at 
FROM organizations 
ORDER BY created_at DESC;
```

**Check user counts:**
```sql
SELECT 
  o.name,
  o.slug,
  COUNT(u.id) as user_count,
  COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count
FROM organizations o
LEFT JOIN users u ON u.org_id = o.id
GROUP BY o.id, o.name, o.slug;
```

---

## Next Steps

### Completed Features ✅
- Platform owner dashboard
- Create organizations
- View organizations list
- Edit organization details
- Manage allowed domains
- Delete organizations
- Real-time stats
- **Invite admins** to organizations ✨ NEW
- **Manage user roles** (promote/demote) ✨ NEW
- **View pending invites** ✨ NEW
- **Cancel invites** ✨ NEW

### Coming Soon 🔜
1. **Enhanced Invite System**
   - Email notifications for invites
   - Resend expired invites
   - Custom invite messages

2. **Advanced User Management**
   - Remove users from organizations
   - Bulk invite multiple users
   - User activity logs
   - Custom roles beyond admin/employee

3. **Advanced Settings**
   - Organization branding
   - Custom permissions
   - Feature flags per org
   - Billing integration

4. **Analytics**
   - Usage statistics
   - Activity charts
   - Growth metrics
   - Export data

---

## Support

### Documentation Files
- `PLATFORM_OWNER_GUIDE.md` - This complete guide
- `ADMIN_MANAGEMENT_GUIDE.md` - Admin invitation and management
- `ORGANIZATION_CREATION_FEATURE.md` - Technical implementation details
- `QUICK_START_ORGANIZATIONS.md` - Quick start guide
- `RLS_FIX_SUMMARY.md` - RLS and security fixes
- `NEXTJS15_PARAMS_FIX.md` - Next.js 15 compatibility
- `APPLY_FIX_NOW.md` - Migration instructions

### Getting Help
1. Check this guide first
2. Review error messages in console
3. Check Supabase dashboard for data
4. Verify environment variables
5. Restart dev server

---

**Last Updated:** 2026-02-06  
**Version:** 1.0  
**Status:** ✅ Production Ready
