# Phase 3 Database Migration Guide

This guide covers all database migrations required for Phase 3 features.

## Prerequisites

- Supabase project access
- Admin rights to run SQL migrations
- Backup of current database

## Migration Order

Run migrations in this order:

1. `phase3_drop_patient_type.sql` - Remove patient type, add ranking
2. `phase3_roles_migration.sql` - Add sales/clinician roles
3. `fix_product_details_in_view.sql` - Fix materialized view (if needed)

---

## Migration 1: Patient Type Removal & Product Ranking

**File:** `database/migrations/phase3_drop_patient_type.sql`

### What it does:
- Drops `patient_type_id` from `procedure_phase_products`
- Adds `rank` column for product ordering
- Adds `custom_phase_labels` to procedures
- Rebuilds `procedures_complete` materialized view

### Run in Supabase SQL Editor:
```sql
-- See full migration in database/migrations/phase3_drop_patient_type.sql
```

### Verification:
```sql
-- Check rank column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'procedure_phase_products' AND column_name = 'rank';

-- Check patient_type_id is removed
SELECT column_name FROM information_schema.columns
WHERE table_name = 'procedure_phase_products' AND column_name = 'patient_type_id';
-- Should return 0 rows

-- Check custom_phase_labels exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'procedures' AND column_name = 'custom_phase_labels';
```

---

## Migration 2: Role System

**File:** `database/migrations/phase3_roles_migration.sql`

### What it does:
- Adds `sales` and `clinician` values to `user_role` enum
- Migrates existing `user` roles to `sales`
- Adds role tracking columns

### Run in Supabase SQL Editor:
```sql
-- Add new enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'clinician';

-- Migrate existing users
UPDATE user_profiles SET role = 'sales' WHERE role = 'user';

-- Add tracking columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role_assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE;

-- Set role_assigned_at for existing users
UPDATE user_profiles
SET role_assigned_at = COALESCE(approved_at, created_at)
WHERE role_assigned_at IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
```

### Verification:
```sql
-- Check enum values exist
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'user_role'::regtype;
-- Should show: admin, sales, clinician

-- Check no 'user' roles remain
SELECT COUNT(*) FROM user_profiles WHERE role = 'user';
-- Should return 0

-- Check new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('role_assigned_by', 'role_assigned_at');
```

---

## Migration 3: Fix Product Details in View

**File:** `database/migrations/fix_product_details_in_view.sql`

### When needed:
Run this if product details (clinical_evidence, pitch_points, objection_handling) are not loading in the ProductDrawer.

### What it does:
- Drops and recreates `procedures_complete` materialized view
- Adds all product_details columns to the JSONB output

### Run in Supabase SQL Editor:
```sql
-- See full migration in database/migrations/fix_product_details_in_view.sql
```

### Verification:
```sql
-- Check product_details includes clinical_evidence
SELECT
  name,
  jsonb_array_length(product_details) as product_count,
  product_details->0->>'clinical_evidence' as sample_evidence,
  product_details->0->>'pitch_points' as sample_pitch
FROM procedures_complete
LIMIT 5;
```

---

## Rollback Procedures

### Rollback Patient Type Removal
```sql
-- Re-add patient_type_id column
ALTER TABLE procedure_phase_products
ADD COLUMN patient_type_id BIGINT REFERENCES patient_types(id);

-- Note: Data recovery requires backup
```

### Rollback Role System
```sql
-- Cannot easily remove enum values in PostgreSQL
-- Would need to recreate the enum type entirely
-- Recommendation: Keep roles, just don't use them
```

---

## Post-Migration Steps

1. **Refresh Materialized View:**
   ```sql
   REFRESH MATERIALIZED VIEW procedures_complete;
   ```

2. **Clear Frontend Cache:**
   ```javascript
   // In browser console
   localStorage.removeItem('conditions_cache_v1');
   ```

3. **Test Application:**
   - Login as admin
   - View a procedure - products should show
   - Check ProductDrawer tabs load correctly
   - Approve a user with role assignment

---

## Common Issues

### Issue: Products not showing ranks
**Solution:** Run this to set default ranks:
```sql
UPDATE procedure_phase_products
SET rank = 1
WHERE rank IS NULL OR rank = 999;
```

### Issue: Clinical evidence not loading
**Solution:** Run `fix_product_details_in_view.sql` migration

### Issue: User role shows as 'user' instead of 'sales'
**Solution:**
```sql
UPDATE user_profiles SET role = 'sales' WHERE role = 'user';
```

### Issue: Materialized view not refreshing
**Solution:** Check the refresh function exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'refresh_procedures_complete';
```

---

## Support

For issues with migrations, check:
1. Supabase dashboard logs
2. Browser console for frontend errors
3. Network tab for failed API requests

Contact: coppsaustin@gmail.com
