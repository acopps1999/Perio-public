-- RLS Policies for the admins table
-- These policies allow the authentication system to work properly with RLS enabled

-- Enable RLS on admins table (if not already enabled)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to read their own admin record
-- This is needed for the login verification step
CREATE POLICY "Users can read their own admin record" 
ON public.admins 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy 2: Allow service role to insert admin records
-- This is needed for admin user creation
CREATE POLICY "Service role can insert admin records" 
ON public.admins 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Policy 3: Allow service role to read all admin records
-- This is needed for admin management
CREATE POLICY "Service role can read all admin records" 
ON public.admins 
FOR SELECT 
TO service_role 
USING (true);

-- Policy 4: Allow authenticated admins to update their own record
-- This allows admins to update their own information
CREATE POLICY "Admins can update their own record" 
ON public.admins 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Allow service role to update and delete admin records
-- This is needed for admin management operations
CREATE POLICY "Service role can update admin records" 
ON public.admins 
FOR UPDATE 
TO service_role 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete admin records" 
ON public.admins 
FOR DELETE 
TO service_role 
USING (true);

-- Optional: Create a function to check if a user is an admin
-- This can be used in other RLS policies across your application
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admins 
    WHERE user_id = user_uuid
  );
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, service_role; 