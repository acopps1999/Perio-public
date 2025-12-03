/**
 * Batch Embedding Generation Script
 *
 * Generates embeddings for all existing database records using OpenAI's
 * text-embedding-3-small model. This script should be run once after setting up
 * the vector database schema.
 *
 * Usage:
 *   node scripts/generateEmbeddings.js
 *
 * Environment:
 *   REACT_APP_SUPABASE_URL - Supabase project URL
 *   REACT_APP_SUPABASE_ANON_KEY - Supabase anon key
 *   REACT_APP_OPENAI_API_KEY - OpenAI API key
 *
 * Requirements:
 *   - OpenAI API key configured in .env.local
 *   - Database migration 003_switch_to_openai_embeddings.sql already run
 */

// Load .env.local if it exists, otherwise fall back to .env
require('dotenv').config({ path: '.env.local' });
if (!process.env.REACT_APP_SUPABASE_URL) {
  require('dotenv').config(); // Fallback to .env
}
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

// Batch size for processing
const BATCH_SIZE = 10; // OpenAI can handle parallel requests reliably

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Process items in batches with delay
 */
async function processBatch(items, processFunc, delayMs = 100) {
  const results = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}...`);

    const batchResults = await Promise.all(batch.map(processFunc));
    results.push(...batchResults);

    // Delay between batches to avoid overwhelming Ollama
    if (i + BATCH_SIZE < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Generate embeddings for procedures
 */
async function embedProcedures() {
  console.log('\n📋 Generating embeddings for procedures...');

  // Fetch all procedures without embeddings
  const { data: procedures, error } = await supabase
    .from('procedures')
    .select('id, name, category, pitch_points, patient_type')
    .is('embedding', null);

  if (error) {
    console.error('❌ Error fetching procedures:', error);
    return { success: false, count: 0 };
  }

  if (!procedures || procedures.length === 0) {
    console.log('✅ All procedures already have embeddings');
    return { success: true, count: 0 };
  }

  console.log(`Found ${procedures.length} procedures without embeddings`);

  let successCount = 0;
  let errorCount = 0;

  await processBatch(procedures, async (proc) => {
    try {
      // Combine all relevant fields for richer semantic search
      const text = [
        proc.name || '',
        proc.category || '',
        proc.patient_type || '',
        proc.pitch_points || ''
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      const embedding = await generateEmbedding(text);

      // Update procedure with embedding
      const { error: updateError } = await supabase
        .from('procedures')
        .update({
          embedding: embedding,
          embedding_generated_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
        })
        .eq('id', proc.id);

      if (updateError) {
        console.error(`❌ Failed to update procedure ${proc.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Embedded: ${proc.name}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing procedure ${proc.id}:`, error);
      errorCount++;
    }
  });

  console.log(`\n✅ Procedures: ${successCount} embedded, ${errorCount} errors`);
  return { success: true, count: successCount };
}

/**
 * Generate embeddings for products table
 * (Simple embeddings for product names only)
 */
async function embedProducts() {
  console.log('\n📦 Generating embeddings for products...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name')
    .is('embedding', null);

  if (error) {
    console.error('❌ Error fetching products:', error);
    return { success: false, count: 0 };
  }

  if (!products || products.length === 0) {
    console.log('✅ All products already have embeddings');
    return { success: true, count: 0 };
  }

  console.log(`Found ${products.length} products without embeddings`);

  let successCount = 0;
  let errorCount = 0;

  await processBatch(products, async (product) => {
    try {
      const embedding = await generateEmbedding(product.name);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          embedding: embedding,
          embedding_generated_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Failed to update product ${product.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Embedded: ${product.name}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing product ${product.id}:`, error);
      errorCount++;
    }
  });

  console.log(`\n✅ Products: ${successCount} embedded, ${errorCount} errors`);
  return { success: true, count: successCount };
}

/**
 * Generate embeddings for product details
 */
async function embedProductDetails() {
  console.log('\n🏥 Generating embeddings for product details...');

  // Fetch only columns that actually exist in the schema
  const { data: details, error } = await supabase
    .from('product_details')
    .select(`
      id,
      product_id,
      products(name),
      clinical_evidence,
      pitch_points,
      rationale,
      rationale_2,
      objection_handling,
      procedure_name,
      product_name
    `)
    .is('embedding', null);

  if (error) {
    console.error('❌ Error fetching product details:', error);
    return { success: false, count: 0 };
  }

  if (!details || details.length === 0) {
    console.log('✅ All product details already have embeddings');
    return { success: true, count: 0 };
  }

  console.log(`Found ${details.length} product details without embeddings`);

  let successCount = 0;
  let errorCount = 0;

  await processBatch(details, async (detail) => {
    try {
      // Combine ALL relevant fields for rich, comprehensive embedding
      // Using actual schema columns only
      const text = [
        detail.products?.name || detail.product_name || '',
        detail.procedure_name || '',
        detail.pitch_points || '',
        detail.clinical_evidence || '',
        detail.rationale || '',
        detail.rationale_2 || '',
        detail.objection_handling || ''
      ]
        .filter(Boolean)
        .join('\n\n')  // Separate sections with double newlines for clarity
        .trim();

      if (!text) {
        console.log(`⚠️ Skipping product detail ${detail.id} - no text content`);
        return;
      }

      // Truncate if exceeds OpenAI's limit (~8000 tokens = ~30000 chars)
      const truncated = text.length > 30000 ? text.slice(0, 30000) + '...' : text;

      const embedding = await generateEmbedding(truncated);

      const { error: updateError } = await supabase
        .from('product_details')
        .update({
          embedding: embedding,
          embedding_generated_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
        })
        .eq('id', detail.id);

      if (updateError) {
        console.error(`❌ Failed to update product detail ${detail.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Embedded: ${detail.products?.name || 'Product ' + detail.id}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing product detail ${detail.id}:`, error);
      errorCount++;
    }
  });

  console.log(`\n✅ Product details: ${successCount} embedded, ${errorCount} errors`);
  return { success: true, count: successCount };
}

/**
 * Generate embeddings for research articles
 */
async function embedResearch() {
  console.log('\n📚 Generating embeddings for research articles...');

  const { data: articles, error } = await supabase
    .from('condition_product_research_articles')
    .select('id, title, abstract')
    .is('title_embedding', null);

  if (error) {
    console.error('❌ Error fetching research articles:', error);
    return { success: false, count: 0 };
  }

  if (!articles || articles.length === 0) {
    console.log('✅ All research articles already have embeddings');
    return { success: true, count: 0 };
  }

  console.log(`Found ${articles.length} research articles without embeddings`);

  let successCount = 0;
  let errorCount = 0;

  await processBatch(articles, async (article) => {
    try {
      // Generate embeddings for both title and abstract
      if (!article.title || article.title.trim().length === 0) {
        console.log(`⚠️ Skipping article ${article.id} - no title`);
        return;
      }

      const titleEmbedding = await generateEmbedding(article.title);

      let abstractEmbedding = null;
      if (article.abstract) {
        abstractEmbedding = await generateEmbedding(article.abstract);
      }

      const { error: updateError } = await supabase
        .from('condition_product_research_articles')
        .update({
          title_embedding: titleEmbedding,
          abstract_embedding: abstractEmbedding,
          embedding_generated_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`❌ Failed to update article ${article.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Embedded: ${article.title?.substring(0, 50)}...`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing article ${article.id}:`, error);
      errorCount++;
    }
  });

  console.log(`\n✅ Research articles: ${successCount} embedded, ${errorCount} errors`);
  return { success: true, count: successCount };
}

/**
 * Check OpenAI status before starting
 */
async function checkOpenAI() {
  try {
    console.log('🔍 Checking OpenAI API key...');

    if (!OPENAI_API_KEY) {
      console.error('❌ Missing REACT_APP_OPENAI_API_KEY in .env.local');
      console.log('\n📥 Get your API key from:');
      console.log('   https://platform.openai.com/api-keys');
      console.log('\nThen add to .env.local:');
      console.log('   REACT_APP_OPENAI_API_KEY=sk-...');
      return false;
    }

    if (!OPENAI_API_KEY.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format (should start with sk-)');
      return false;
    }

    // Test API key with a simple request
    await openai.models.list();

    console.log(`✅ OpenAI API key is valid`);
    console.log(`✅ Using model: ${EMBEDDING_MODEL}`);
    return true;
  } catch (error) {
    console.error('❌ OpenAI check failed:', error.message);
    console.log('\n📥 Make sure your API key is valid and has credits');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting embedding generation...\n');

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
  }

  // Check OpenAI
  const openaiReady = await checkOpenAI();
  if (!openaiReady) {
    process.exit(1);
  }

  // Generate embeddings for all tables
  const startTime = Date.now();

  const results = await Promise.all([
    embedProcedures(),
    embedProducts(),           // ← NEW: Embed products table
    embedProductDetails(),
    embedResearch(),
  ]);

  const totalCount = results.reduce((sum, r) => sum + r.count, 0);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Embedding generation complete!`);
  console.log(`📊 Total embeddings generated: ${totalCount}`);
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log('='.repeat(50));
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
