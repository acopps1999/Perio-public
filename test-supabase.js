// Quick Supabase connection test
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\nTesting patient_types table...');
    const { data, error } = await supabase
      .from('patient_types')
      .select('id, name')
      .limit(5);
    
    if (error) {
      console.error('ERROR:', error);
    } else {
      console.log('SUCCESS! Got', data.length, 'patient types:', data);
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
  }
  
  process.exit(0);
}

testConnection();
