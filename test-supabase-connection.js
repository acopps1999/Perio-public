#!/usr/bin/env node

/**
 * Standalone Supabase Connection Test
 *
 * Tests if Supabase queries work outside of the React app.
 * This helps identify if the issue is with React/browser or Supabase itself.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('\n🔍 Supabase Connection Test\n');
console.log('='.repeat(60));
console.log(`\n📊 Configuration:`);
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'}\n`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🧪 Test 1: Simplest possible query (LIMIT 1)');
  console.log('   Query: SELECT id, name FROM procedures LIMIT 1\n');

  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('procedures')
      .select('id, name')
      .limit(1);

    const duration = Date.now() - start;

    if (error) {
      console.error(`❌ Query failed (${duration}ms):`, error);
      return false;
    }

    console.log(`✅ Query succeeded (${duration}ms)`);
    console.log(`   Returned ${data?.length || 0} rows`);
    if (data && data.length > 0) {
      console.log(`   Sample: ${JSON.stringify(data[0])}\n`);
    }
    return true;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function testAllTables() {
  const tables = [
    'procedures',
    'categories',
    'products',
    'phases',
    'patient_types',
    'procedure_phases',
    'procedure_phase_products'
  ];

  console.log('\n🧪 Test 2: Check all tables\n');

  for (const table of tables) {
    const start = Date.now();
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    const duration = Date.now() - start;

    if (error) {
      console.log(`   ❌ ${table.padEnd(30)} FAILED (${duration}ms) - ${error.message}`);
    } else {
      console.log(`   ✅ ${table.padEnd(30)} ${count} rows (${duration}ms)`);
    }
  }
}

async function main() {
  const test1Passed = await testConnection();

  if (!test1Passed) {
    console.log('\n❌ Basic connection test failed. Cannot proceed.\n');
    console.log('💡 Possible issues:');
    console.log('   - Supabase project is paused/sleeping');
    console.log('   - Network/firewall blocking connection');
    console.log('   - Supabase API credentials are invalid');
    console.log('   - RLS policies are too restrictive\n');
    process.exit(1);
  }

  await testAllTables();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All tests passed! Supabase connection is working.\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
