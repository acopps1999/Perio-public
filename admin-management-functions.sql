-- Manual admin management functions
-- These allow you to promote/demote users to/from admin status

-- Function to promote an existing auth user to admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  admin_record record;
  result json;
BEGIN
  -- Find the user in auth.users by email
  SELECT id, email INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'success', false,
      'message', 'User not found in auth.users',
      'email', user_email
    );
    RETURN result;
  END IF;
  
  -- Check if user is already an admin
  SELECT * INTO admin_record
  FROM public.admins
  WHERE user_id = user_record.id;
  
  IF FOUND THEN
    result := json_build_object(
      'success', false,
      'message', 'User is already an admin',
      'email', user_email,
      'user_id', user_record.id
    );
    RETURN result;
  END IF;
  
  -- Add user to admins table
  INSERT INTO public.admins (user_id, email)
  VALUES (user_record.id, user_record.email);
  
  result := json_build_object(
    'success', true,
    'message', 'User promoted to admin successfully',
    'email', user_email,
    'user_id', user_record.id
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', 'Error promoting user: ' || SQLERRM,
      'email', user_email
    );
    RETURN result;
END;
$$;

-- Function to remove admin privileges from a user
CREATE OR REPLACE FUNCTION public.demote_admin_user(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  result json;
  rows_deleted integer;
BEGIN
  -- Find the user in auth.users by email
  SELECT id, email INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'success', false,
      'message', 'User not found in auth.users',
      'email', user_email
    );
    RETURN result;
  END IF;
  
  -- Remove user from admins table
  DELETE FROM public.admins
  WHERE user_id = user_record.id;
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  IF rows_deleted = 0 THEN
    result := json_build_object(
      'success', false,
      'message', 'User was not an admin',
      'email', user_email,
      'user_id', user_record.id
    );
  ELSE
    result := json_build_object(
      'success', true,
      'message', 'Admin privileges removed successfully',
      'email', user_email,
      'user_id', user_record.id
    );
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', 'Error demoting user: ' || SQLERRM,
      'email', user_email
    );
    RETURN result;
END;
$$;

-- Function to list all current admins
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS table(
  admin_id integer,
  user_id uuid,
  email text,
  created_at timestamptz,
  auth_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as admin_id,
    a.user_id,
    a.email,
    a.created_at,
    u.created_at as auth_created_at
  FROM public.admins a
  LEFT JOIN auth.users u ON a.user_id = u.id
  ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin TO service_role;
GRANT EXECUTE ON FUNCTION public.demote_admin_user TO service_role;
GRANT EXECUTE ON FUNCTION public.list_admin_users TO service_role; 