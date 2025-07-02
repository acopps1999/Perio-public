# Secure Admin Setup Guide

## Overview
This guide sets up admin authentication with maximum password security. After following these steps, passwords will be completely private - even you as the database administrator will not be able to see them.

## Security Benefits

✅ **Passwords are invisible to database admins**: Supabase Auth handles all password hashing and storage  
✅ **Industry-standard security**: Uses bcrypt hashing with salt  
✅ **No plain text storage**: Passwords never appear in your database  
✅ **Secure authentication flow**: Proper session management  
✅ **RLS compliance**: Works perfectly with Row Level Security  

## Setup Steps

### 1. Remove Password Field from Database
Run this SQL in your Supabase SQL Editor:
```sql
-- Remove the password field from admins table
ALTER TABLE public.admins DROP COLUMN IF EXISTS "Password";
```

### 2. Set Up RLS Policies (if not done already)
Run the SQL from `setup-rls-policies.sql` in your Supabase SQL Editor.

### 3. Choose Your Admin Creation Strategy
Pick one approach for how new users become admins:

**Option A: Automatic (All Auth Users Become Admins)**
```sql
-- Run auto-admin-trigger.sql
-- All users created via Supabase Auth Dashboard become admins automatically
```

**Option B: Selective (Only Users with Admin Metadata)**
```sql
-- Run selective-admin-trigger.sql  
-- Only users with {"role": "admin"} in metadata become admins
```

**Option C: Manual Only**
```sql
-- Run admin-management-functions.sql
-- No automatic admin creation, use functions to promote users
```

### 4. Add Service Role Key to Environment
Add this line to your `.env` file:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard
```

Find your service role key at: Supabase Dashboard → Project Settings → API → service_role key

### 5. Create Admin User
Run the secure admin creation script:
```bash
node create-any-admin.js austin@austincopps.com austinadmin
```

### 6. Remove Service Role Key (Security Best Practice)
After creating the admin user, remove the service role key from your `.env` file:
```bash
# Comment out or remove this line after admin creation:
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Updated Database Schema

After removing the password field, your `admins` table will look like:
```sql
CREATE TABLE public.admins (
  id integer PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);
```

## How Password Security Works Now

1. **Password Storage**: Supabase Auth stores passwords using industry-standard bcrypt hashing
2. **Authentication**: Login happens through Supabase Auth API (not database queries)
3. **Verification**: After auth, the system checks if the user exists in the `admins` table
4. **No Password Access**: Database admins cannot see or retrieve actual passwords
5. **Session Management**: Secure JWT tokens handle authenticated sessions

## Creating Additional Admin Users

### Method 1: Through Supabase Auth Dashboard (Automatic)
If you've set up the auto-admin trigger:
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. ✅ They'll automatically become an admin!

### Method 2: Selective Admin Creation
If using the selective trigger:
1. Go to Supabase Dashboard → Authentication → Users  
2. Click "Add user"
3. In "User Metadata" add: `{"role": "admin"}`
4. ✅ Only users with admin role metadata become admins

### Method 3: Manual Promotion
Promote existing auth users to admin:
```sql
-- In Supabase SQL Editor:
SELECT public.promote_user_to_admin('newadmin@company.com');
```

### Method 4: Script Creation (Original Method)
1. Temporarily add service role key to `.env`
2. Run: `node create-any-admin.js newadmin@company.com securePassword123`
3. Remove service role key from `.env`

## Admin Management Functions

If you installed the admin management functions, you can:

### List All Admins
```sql
SELECT * FROM public.list_admin_users();
```

### Promote User to Admin
```sql
SELECT public.promote_user_to_admin('user@example.com');
```

### Remove Admin Privileges
```sql
SELECT public.demote_admin_user('user@example.com');
```

## Password Reset

If an admin forgets their password:
1. They can use Supabase's built-in password reset flow
2. Or you can reset it using the service role key temporarily
3. The new password will still be completely private

## Testing the Setup

After setup, test that:
- ✅ Admin can log in with email/password
- ✅ Invalid credentials are rejected
- ✅ You cannot see passwords in the database
- ✅ Admin panel works correctly
- ✅ Auto-logout functions properly

## Security Notes

- **Service Role Key**: Only use temporarily for admin creation, then remove
- **Password Visibility**: You will never see actual passwords in the database
- **Authentication**: All handled by Supabase's secure infrastructure
- **RLS Compliance**: Admin access is properly controlled by Row Level Security 