# Admin Management Guide

## 📖 Overview

The Admin Management feature allows you (platform owner) to invite and manage administrators for each organization. Admins are essential for running organizations - they can invite employees, create assessments, and manage their organization's data.

## 🎯 Key Features

✅ **Invite admins** by email  
✅ **Invite employees** by email  
✅ **View all users** in organization  
✅ **Promote employees** to admin  
✅ **Demote admins** to employee  
✅ **View pending invites**  
✅ **Cancel invites** before they're accepted  
✅ **Real-time stats** update  

---

## 🚀 Getting Started

### Where to Find It

1. Go to **Platform Owner Dashboard** (`/platform-owner`)
2. Click on any **organization**
3. Scroll down to see **two new sections**:
   - **Invite Admin** - Send invitations
   - **Users & Admins** - Manage existing users

---

## 📧 Inviting Admins

### Step-by-Step

1. **Navigate to Organization Details**
   - Click organization from dashboard

2. **Find "Invite Admin" Section**
   - Located below "Organization Settings"

3. **Enter Email Address**
   - Type the email of the person you want to invite
   - Example: `admin@example.com`

4. **Select Role**
   - **Admin** - Can manage organization, invite employees, create assessments
   - **Employee** - Can take assessments, access organization data

5. **Click "Send Invite"**
   - Invite is created
   - Status shows as "Pending"
   - Invite expires in 7 days

### What Happens After Inviting

```
You send invite
    ↓
Invite stored in database (status: pending)
    ↓
User signs in with Google
    ↓
System checks for pending invite
    ↓
User automatically added to organization
    ↓
Invite status changes to "accepted"
    ↓
User appears in Users & Admins list
```

### Invite Validation

**Email Format:**
- ✅ Must be valid email format
- ❌ Cannot invite same email twice
- ❌ Cannot invite existing users

**Role:**
- ✅ Admin or Employee
- Admin recommended for first user

---

## 👥 Managing Users

### Users & Admins List

Shows all users currently in the organization:

#### User Card Shows:
- **Profile icon** (purple for admin, blue for employee)
- **Name or email**
- **Role** (admin/employee)
- **Position** (if set)
- **Status** badge (active/pending/suspended)
- **Action button** (promote/demote)

### Promoting Users

**Make an employee an admin:**

1. Find the user in **Users & Admins** list
2. Click **"Promote to Admin"** button
3. User role updates to admin
4. Stats update automatically
5. Success toast notification

**When to promote:**
- User needs to manage organization
- User should invite employees
- User needs admin permissions

### Demoting Users

**Make an admin an employee:**

1. Find the admin in **Users & Admins** list
2. Click **"Demote to Employee"** button
3. User role updates to employee
4. Stats update automatically
5. Success toast notification

**When to demote:**
- User no longer needs admin access
- Reduce admin permissions
- Temporary role change

---

## ⏳ Pending Invites

### What You See

Pending invites appear in the **"Invite Admin"** section:

```
┌─────────────────────────────────────────┐
│ 📧 admin@example.com                    │
│    admin • Expires Feb 13, 2026    [X]  │
└─────────────────────────────────────────┘
```

### Invite Information
- **Email** - Who was invited
- **Role** - admin or employee
- **Expiration date** - 7 days from invite
- **Cancel button** - Remove invite

### Cancelling Invites

**Why cancel:**
- Invited wrong email
- Person declined
- Role changed

**How to cancel:**
1. Find invite in **Pending Invites** section
2. Click **X button**
3. Invite status changes to "cancelled"
4. Invite removed from list
5. Can invite same email again if needed

---

## 📊 Stats Update

When you invite admins or change roles, the stats update automatically:

### Organization Stats
- **Total Users** - Increases when invite accepted
- **Admins** - Updates when role changes
- **Status** - Shows organization activity

### Real-time Updates
- Invite sent → Stats stay same (pending)
- Invite accepted → User count increases
- User promoted → Admin count increases
- User demoted → Admin count decreases

---

## 🔐 Security & Permissions

### Who Can Invite Admins?

✅ **Platform owner only** (you)  
❌ **Organization admins** cannot invite admins (yet)  
❌ **Employees** cannot invite anyone  

### Authentication Flow

```
API Request
    ↓
Check user authenticated
    ↓
Verify platform owner email
    ↓
Use service role client (bypass RLS)
    ↓
Create invite / update user
    ↓
Return success
```

### Why This is Secure

- Email validation at API level
- Platform owner check before any DB operations
- Service client only used after auth
- Cannot invite duplicate emails
- Cannot promote non-existent users

---

## 🎨 UI Features

### Visual Indicators

**Role Colors:**
- 🟣 **Purple** - Admin (purple gradient badge)
- 🔵 **Blue** - Employee (blue gradient badge)

**Status Badges:**
- 🟢 **Active** - Green badge, user is active
- 🟡 **Pending** - Yellow badge, invite not accepted yet
- 🔴 **Suspended** - Red badge, user suspended

**Icons:**
- 📧 **Mail icon** - Admins
- 👥 **Users icon** - Employees

### Interactive Elements

- **Hover effects** on user cards
- **Loading states** when inviting
- **Toast notifications** for all actions
- **Smooth animations** when sections load

---

## 📱 User Experience Flow

### First Time Setting Up Organization

1. **Create organization** (name, slug, domains)
2. **Invite first admin** (required to run org)
3. **Admin signs in** with Google
4. **Admin invited to org** automatically
5. **Admin can now**:
   - Invite employees
   - Create assessments
   - Manage organization data

### Adding More Admins Later

1. **Go to organization details**
2. **Invite additional admins**
3. **They sign in and join**
4. **Multiple admins** can collaborate

### Managing Team Changes

1. **Employee needs more access** → Promote to admin
2. **Admin role no longer needed** → Demote to employee
3. **Wrong person invited** → Cancel invite
4. **Need more employees** → Admins can invite them (coming soon)

---

## 🔧 API Endpoints

### GET /api/organizations/:id/users

**Description:** List all users in organization

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "admin@example.com",
    "full_name": "John Doe",
    "role": "admin",
    "status": "active",
    "position": "Manager",
    "created_at": "2026-02-06T...",
    "last_login_at": "2026-02-06T..."
  }
]
```

### POST /api/organizations/:id/invites

**Description:** Create invite for user

**Request:**
```json
{
  "email": "admin@example.com",
  "role": "admin"
}
```

**Response:**
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "email": "admin@example.com",
  "role": "admin",
  "status": "pending",
  "expires_at": "2026-02-13T...",
  "created_at": "2026-02-06T..."
}
```

### GET /api/organizations/:id/invites

**Description:** List pending invites

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "status": "pending",
    "expires_at": "2026-02-13T...",
    "created_at": "2026-02-06T..."
  }
]
```

### DELETE /api/invites/:inviteId

**Description:** Cancel invite

**Response:**
```json
{
  "message": "Invite cancelled successfully"
}
```

### PATCH /api/users/:userId/role

**Description:** Change user role

**Request:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "updated_at": "2026-02-06T..."
}
```

---

## ⚠️ Common Scenarios

### Scenario 1: Creating First Organization

**Problem:** Just created organization, no admins yet.

**Solution:**
1. Go to organization details page
2. Invite first admin immediately
3. Wait for them to sign in
4. They become first admin
5. They can then invite employees

### Scenario 2: User Already Invited

**Problem:** "User already exists in this organization"

**Solution:**
1. Check **Users & Admins** list
2. User might already be there
3. If you want different role, use promote/demote
4. If duplicate invite, cancel old one first

### Scenario 3: Invite Not Working

**Problem:** Invited user not appearing

**Solution:**
1. Check **Pending Invites** section
2. Verify invite status is "pending"
3. User must sign in with **exact email** you invited
4. Invite expires in 7 days - may need to re-invite

### Scenario 4: Need to Remove Admin

**Problem:** Admin no longer needed

**Solution:**
- **Option 1:** Demote to employee (keeps in org)
- **Option 2:** Remove from org entirely (coming soon)
- For now, demote to employee is recommended

### Scenario 5: Wrong Email Invited

**Problem:** Typo in email address

**Solution:**
1. Find invite in **Pending Invites**
2. Click **X** to cancel
3. Send new invite with correct email
4. Old invite becomes "cancelled"

---

## 🚦 Status Flow

### Invite Lifecycle

```
Created (pending)
    ↓
User signs in
    ↓
Accepted
    ↓
User added to organization

OR

Created (pending)
    ↓
Platform owner cancels
    ↓
Cancelled

OR

Created (pending)
    ↓
7 days pass
    ↓
Expired
```

### User Status

- **Active** - User is fully active, can access org
- **Pending** - User invited but hasn't signed in yet
- **Suspended** - User temporarily disabled (future feature)

---

## ✅ Best Practices

### Inviting Admins

1. **Start with one admin** per organization
2. **Invite trusted people** first
3. **Use work emails** matching allowed domains
4. **Send invite immediately** after creating org
5. **Follow up** if invite not accepted in 2-3 days

### Managing Roles

1. **Be selective with admin role** - powerful permissions
2. **Promote when needed** - employee proven responsible
3. **Demote temporarily** - if admin unavailable
4. **Keep at least one admin** - organization needs management

### Organization Health

1. **At least 1 admin** required per organization
2. **2-3 admins** recommended for medium organizations
3. **More admins** for large organizations
4. **Review roles regularly** - ensure correct permissions

---

## 🔜 Coming Features

### Short Term
- ✅ Invite admins (Done!)
- ✅ Manage user roles (Done!)
- 🔜 **Email notifications** for invites
- 🔜 **Resend invite** if expired
- 🔜 **Custom invite message**

### Medium Term
- 🔜 **Admin can invite employees** (not just platform owner)
- 🔜 **Remove users** from organization
- 🔜 **Bulk invite** multiple users
- 🔜 **User activity logs**

### Long Term
- 🔜 **Custom roles** beyond admin/employee
- 🔜 **Granular permissions** per role
- 🔜 **User onboarding** flow
- 🔜 **Welcome emails** for new admins

---

## 🐛 Troubleshooting

### "Failed to send invite"

**Causes:**
- Invalid email format
- User already invited
- User already in organization
- Network error

**Fix:**
1. Check email format
2. Check Pending Invites list
3. Check Users & Admins list
4. Try again

### "Failed to update role"

**Causes:**
- User doesn't exist
- Network error
- Permission issue

**Fix:**
1. Refresh page
2. Verify user in list
3. Check browser console
4. Try again

### Users not appearing

**Causes:**
- Page not refreshed
- Invite still pending
- User hasn't signed in yet

**Fix:**
1. Hard refresh (Cmd/Ctrl + Shift + R)
2. Check Pending Invites
3. Verify user signed in with correct email

### Invite email mismatch

**Problem:** User signed in but not added to org

**Cause:** Email doesn't match invite

**Fix:**
1. User must sign in with **exact email** from invite
2. Check for typos in invite
3. Cancel and resend if needed

---

## 📚 Related Documentation

- `PLATFORM_OWNER_GUIDE.md` - Complete platform owner guide
- `ORGANIZATION_CREATION_FEATURE.md` - Organization creation
- `RLS_FIX_SUMMARY.md` - Security and RLS policies
- `NEXTJS15_PARAMS_FIX.md` - Technical fixes

---

## 💡 Tips & Tricks

1. **Invite admins right after creating org** - Don't delay
2. **Use email matching allowed domains** - Auto-join if configured
3. **Promote existing employees** instead of inviting new admins
4. **Cancel unused invites** - Keep pending list clean
5. **Check stats regularly** - Monitor admin count
6. **Keep backup admin** - Always have 2+ admins for redundancy

---

**Last Updated:** 2026-02-06  
**Version:** 1.0  
**Status:** ✅ Ready to Use
