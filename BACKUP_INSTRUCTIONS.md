# Database Backup & Testing Instructions

## Choose Your Method:

---

## Method 1: Supabase Dashboard (EASIEST - Recommended)

### Step 1: Use Point-in-Time Recovery (if available on your plan)
1. Go to **Supabase Dashboard**
2. Navigate to **Database** → **Backups**
3. Click **"Download Backup"** for the most recent backup
4. Save the `.sql` file locally

### Step 2: Create Test Project
1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Name it something like `perio-test` or `perio-staging`
4. Wait for project to be provisioned

### Step 3: Restore to Test Project
1. In the NEW test project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of your backup SQL file
4. Paste and **Run**
5. Wait for completion

### Step 4: Test RLS Policies
1. Update your `.env.local` (create if doesn't exist):
   ```env
   REACT_APP_SUPABASE_URL=https://your-test-project-ref.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-test-anon-key
   ```
2. Run the RLS policy fix script in the TEST project
3. Test all admin operations
4. If everything works, apply to production

---

## Method 2: Using pg_dump (Command Line)

### Prerequisites
- Install PostgreSQL tools: `brew install postgresql` (Mac) or `apt-get install postgresql-client` (Linux)
- Get your database password from Supabase Dashboard → Settings → Database

### Step 1: Make Backup Script Executable
```bash
chmod +x backup_database.sh
```

### Step 2: Run Backup
```bash
./backup_database.sh
```

### Step 3: Follow prompts
- Enter your database password when prompted
- Backup will be saved as `database_backup_YYYYMMDD_HHMMSS.sql`

### Step 4: Create Test Project & Restore
```bash
# After creating new Supabase project:
PGPASSWORD=<test_db_password> psql \
  -h db.<test_project_ref>.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f database_backup_YYYYMMDD_HHMMSS.sql
```

---

## Method 3: Simple SQL Export from Dashboard (FASTEST)

### Step 1: Export Current Schema & Data
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query to get table data export:
   ```sql
   -- This will show you all tables
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
3. For each important table, run:
   ```sql
   SELECT * FROM your_table_name;
   ```
4. Export results as CSV from SQL Editor

### Step 2: Create Test Project
1. Create new Supabase project
2. Copy your `supabase_schema.sql`
3. Run it in the new project's SQL Editor

### Step 3: Import Data
1. Use Supabase Dashboard → **Table Editor**
2. Import CSV files for each table

---

## After Testing on Duplicate:

### If RLS Policies Work ✅
1. Copy the exact SQL that worked
2. Run on your production database
3. Document the changes in `supabase_schema.sql`

### If Something Goes Wrong ❌
1. Delete the test project (no harm done to production)
2. Adjust the RLS policy script
3. Try again on a fresh test project

---

## Quick Reference: Finding Your Database Credentials

**Supabase Dashboard** → **Settings** → **Database**

Look for:
- **Host**: `db.YOUR_PROJECT_REF.supabase.co`
- **Database name**: `postgres`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: Click "Show" to reveal

---

## Environment Variables for Testing

Create `.env.local` (git-ignored) for testing:

```env
# TEST ENVIRONMENT
REACT_APP_SUPABASE_URL=https://test-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=test-anon-key

# Rename to .env when ready to go live with changes
```

Then run: `npm run dev` - will use test database!

---

## Rollback Plan

If something goes wrong in production:

1. **Stop the app** (if deployed)
2. **Restore from backup**:
   - Supabase Dashboard → Database → Backups → Restore
3. **Check admin table**: Make sure your user is still in `admins` table
4. **Test login**: Verify you can still access admin panel

---

## Safety Checklist Before Applying to Production

- [ ] Tested all CRUD operations in test environment
- [ ] Verified admin users can add/edit/delete
- [ ] Verified non-admin users are blocked (if applicable)
- [ ] Backup created and saved locally
- [ ] RLS policy script reviewed
- [ ] Team notified of maintenance window (if needed)

