-- Auto-populate admins table when users are created via Supabase Auth dashboard
-- This trigger will automatically add any new auth user to the admins table

-- First, create a function that will be triggered
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new user into admins table
  INSERT INTO public.admins (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create admin record for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.admins TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin; 