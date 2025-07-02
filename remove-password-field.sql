-- Remove the password field from admins table
-- Supabase Auth will handle all password security from now on

-- Step 1: Remove the Password column from the admins table
ALTER TABLE public.admins DROP COLUMN IF EXISTS "Password";

-- Step 2: Update any existing RLS policies that might reference the password field
-- (The policies we created earlier don't reference the password field, so this is just precautionary)

-- Step 3: Verify the table structure
-- You can run this to see the updated table structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'admins' AND table_schema = 'public';

-- Note: After running this, passwords will be completely managed by Supabase Auth
-- - Passwords are automatically hashed and salted
-- - You (as database admin) cannot see the actual passwords
-- - Authentication happens through Supabase's secure auth system
-- - Only the user_id link between auth.users and admins table remains 