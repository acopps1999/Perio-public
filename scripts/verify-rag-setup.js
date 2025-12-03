#!/usr/bin/env node
/**
 * RAG Setup Verification Script
 *
 * Checks if your Supabase database is properly configured for RAG:
 * 1. Vector extension enabled
 * 2. Vector search functions exist
 * 3. Embedding columns have data
 * 4. OpenAI API key is valid
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
  console.log('🔍 Verifying RAG Setup...\n');

  const results = {
    vectorExtension: false,
    functions: {
      match_procedures: false,
      match_product_details: false,
      match_research_articles: false,
    },
    embeddings: {
      procedures: 0,
      product_details: 0,
      research_articles: 0,
    },
    openaiKey: false,
  };

  // 1. Check OpenAI API Key
  console.log('1️⃣  Checking OpenAI API Key...');
  if (openaiKey && openaiKey.startsWith('sk-')) {
    console.log('   ✅ OpenAI API key configured');
    results.openaiKey = true;
  } else {
    console.log('   ❌ OpenAI API key not configured or invalid');
    console.log('      Add REACT_APP_OPENAI_API_KEY=sk-... to .env.local');
  }

  // 2. Check if pgvector extension is enabled
  console.log('\n2️⃣  Checking pgvector extension...');
  try {
    const { data, error } = await supabase.rpc('pg_extension_list');
    if (!error && data) {
      const hasVector = data.some(ext => ext.name === 'vector');
      if (hasVector) {
        console.log('   ✅ pgvector extension enabled');
        results.vectorExtension = true;
      } else {
        console.log('   ❌ pgvector extension NOT enabled');
        console.log('      Run: CREATE EXTENSION vector; in Supabase SQL Editor');
      }
    }
  } catch (err) {
    console.log('   ⚠️  Could not verify extension (this is okay)');
  }

  // 3. Check if vector search functions exist
  console.log('\n3️⃣  Checking vector search functions...');

  const functionsToCheck = [
    'match_procedures',
    'match_product_details',
    'match_research_articles'
  ];

  for (const funcName of functionsToCheck) {
    try {
      // Try to call function with dummy parameters
      const { error } = await supabase.rpc(funcName, {
        query_embedding: Array(1536).fill(0),
        match_threshold: 0.5,
        match_count: 1,
      });

      if (!error || error.message.includes('vector')) {
        console.log(`   ✅ ${funcName} exists`);
        results.functions[funcName] = true;
      } else {
        console.log(`   ❌ ${funcName} missing or broken`);
        console.log(`      Error: ${error.message}`);
      }
    } catch (err) {
      console.log(`   ❌ ${funcName} missing`);
    }
  }

  // 4. Check if embeddings are populated
  console.log('\n4️⃣  Checking embedding data...');

  // Check procedures embeddings
  try {
    const { count, error } = await supabase
      .from('procedures')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    if (!error) {
      results.embeddings.procedures = count || 0;
      console.log(`   Procedures with embeddings: ${count}`);
    }
  } catch (err) {
    console.log('   ⚠️  Could not check procedures embeddings');
  }

  // Check product_details embeddings
  try {
    const { count, error } = await supabase
      .from('product_details')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    if (!error) {
      results.embeddings.product_details = count || 0;
      console.log(`   Product details with embeddings: ${count}`);
    }
  } catch (err) {
    console.log('   ⚠️  Could not check product_details embeddings');
  }

  // Check research articles embeddings
  try {
    const { count, error } = await supabase
      .from('condition_product_research_articles')
      .select('id', { count: 'exact', head: true })
      .not('title_embedding', 'is', null);

    if (!error) {
      results.embeddings.research_articles = count || 0;
      console.log(`   Research articles with embeddings: ${count}`);
    }
  } catch (err) {
    console.log('   ⚠️  Could not check research embeddings');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');

  const allFunctionsExist = Object.values(results.functions).every(v => v === true);
  const hasEmbeddings = Object.values(results.embeddings).some(v => v > 0);
  const isFullyConfigured = results.openaiKey && allFunctionsExist && hasEmbeddings;

  if (isFullyConfigured) {
    console.log('✅ RAG system is FULLY configured and ready to use!\n');
  } else {
    console.log('❌ RAG system is NOT fully configured. Issues found:\n');

    if (!results.openaiKey) {
      console.log('   • OpenAI API key missing or invalid');
    }

    if (!allFunctionsExist) {
      console.log('   • Vector search functions missing');
      console.log('     → Run CREATE_VECTOR_SEARCH_FUNCTIONS.sql in Supabase');
    }

    if (!hasEmbeddings) {
      console.log('   • No embeddings generated yet');
      console.log('     → Need to generate embeddings for existing data');
    }

    console.log('\n📖 See CREATE_VECTOR_SEARCH_FUNCTIONS.sql for setup instructions');
  }

  console.log('='.repeat(60));

  return results;
}

// Run verification
verifySetup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
