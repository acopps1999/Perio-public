#!/usr/bin/env node
/**
 * Test script to verify procedure insert works
 * Run with: node scripts/test-insert-procedure.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertProcedure() {
  console.log('🧪 Testing procedure insert...\n');
  console.log('Supabase URL:', supabaseUrl);

  // First, get a category ID
  console.log('\n1️⃣ Fetching categories...');
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name')
    .limit(1);

  if (catError) {
    console.error('❌ Error fetching categories:', catError);
    return;
  }

  if (!categories || categories.length === 0) {
    console.error('❌ No categories found in database');
    return;
  }

  const categoryId = categories[0].id;
  console.log('✅ Found category:', categories[0].name, '(ID:', categoryId, ')');

  // Try to insert a test procedure
  const testProcedure = {
    name: `Test Procedure ${Date.now()}`, // Unique name
    category_id: categoryId,
    pitch_points: 'Test pitch points',
    patient_type: 'Types 1 to 4'
  };

  console.log('\n2️⃣ Attempting to insert test procedure...');
  console.log('Data:', JSON.stringify(testProcedure, null, 2));

  const { data, error } = await supabase
    .from('procedures')
    .insert([testProcedure])
    .select();

  if (error) {
    console.error('\n❌ INSERT FAILED!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('\nFull error object:', JSON.stringify(error, null, 2));

    // Check for RLS issues
    if (error.code === '42501') {
      console.error('\n⚠️  This appears to be a Row Level Security (RLS) issue.');
      console.error('You may need to disable RLS or update policies on the procedures table.');
    }

    return;
  }

  console.log('\n✅ INSERT SUCCESSFUL!');
  console.log('Inserted procedure:', data);

  // Clean up - delete the test procedure
  if (data && data[0]) {
    console.log('\n3️⃣ Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('procedures')
      .delete()
      .eq('id', data[0].id);

    if (deleteError) {
      console.error('⚠️  Could not delete test procedure:', deleteError.message);
    } else {
      console.log('✅ Test procedure deleted');
    }
  }

  console.log('\n✨ Test complete!');
}

testInsertProcedure().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
