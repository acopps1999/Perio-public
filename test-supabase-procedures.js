// Test procedures table query (the one that's hanging)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProcedures() {
  try {
    console.log('Testing procedures table query (like in the app)...');
    const { data, error } = await supabase
      .from('procedures')
      .select(`
        id, name, category_id, pitch_points, patient_type, created_at, updated_at,
        categories:category_id (name)
      `)
      .limit(3);
    
    if (error) {
      console.error('ERROR:', error);
    } else {
      console.log('SUCCESS! Got', data.length, 'procedures');
      console.log('First procedure:', JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
  }
  
  process.exit(0);
}

testProcedures();
