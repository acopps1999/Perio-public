require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node create-any-admin.js <email> <password>');
  console.error('Example: node create-any-admin.js admin@example.com securepassword123');
  process.exit(1);
}

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL exists:', !!supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY in your .env file');
  console.error('You can find this key in your Supabase project settings under API');
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser(email, password) {
  console.log(`Creating admin user: ${email}`);
  
  try {
    // First, create the user in Supabase Auth using the Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // If user already exists, try to get the existing user
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('User already exists, fetching existing user...');
        const { data: existingUser, error: fetchError } = await supabase.auth.admin.getUserByEmail(email);
        
        if (fetchError) {
          console.error('Error fetching existing user:', fetchError);
          return;
        }
        
        console.log('Found existing user:', existingUser.user.id);
        
        // Now add to admins table
        await addToAdminsTable(existingUser.user.id, email);
        return;
      }
      return;
    }

    if (!authData.user) {
      console.error('No user data returned from auth signup');
      return;
    }

    console.log('Auth user created successfully:', authData.user.id);
    
    // Now add the user to the admins table (service role bypasses RLS)
    await addToAdminsTable(authData.user.id, email);

  } catch (err) {
    console.error('Failed to create admin user:', err);
  }
}

async function addToAdminsTable(userId, email) {
  console.log('Adding user to admins table with service role...');
  
  try {
    // Check if admin record already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingAdmin) {
      console.log('Admin record already exists:', existingAdmin);
      return;
    }

    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          user_id: userId,
          email: email
        }
      ])
      .select();

    if (error) {
      console.error('Error adding to admins table:', error);
      console.log('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return;
    }

    console.log('Admin record added successfully:', data);
    console.log(`\n✅ Admin user created successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Password: [HIDDEN] - Only the user knows this password`);
    console.log(`\n🛡️ Security Note: The password is now stored securely in Supabase Auth.`);
    console.log(`As a database admin, you cannot see or retrieve this password.`);

  } catch (err) {
    console.error('Failed to add to admins table:', err);
  }
}

createAdminUser(email, password); 