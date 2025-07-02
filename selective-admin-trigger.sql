-- Selective admin creation - only create admin records for users marked as admins
-- This is more secure as it requires explicit admin designation

-- Function that checks if a user should be an admin
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_selective()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create admin record if user has admin role in metadata
  IF (NEW.raw_user_meta_data->>'role' = 'admin') OR 
     (NEW.user_metadata->>'role' = 'admin') THEN
    
    INSERT INTO public.admins (user_id, email)
    VALUES (NEW.id, NEW.email);
    
    RAISE LOG 'Admin record created for user % with email %', NEW.id, NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create admin record for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the selective trigger
CREATE OR REPLACE TRIGGER on_auth_user_created_selective
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_selective();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.admins TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_selective() TO supabase_auth_admin; 