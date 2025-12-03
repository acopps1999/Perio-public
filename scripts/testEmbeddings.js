/**
 * Quick Test: Verify embeddings exist and test search with low thresholds
 */

require('dotenv').config({ path: '.env.local' });
if (!process.env.REACT_APP_SUPABASE_URL) {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function testEmbeddings() {
  console.log('🔍 Testing embeddings...\n');

  // 1. Check how many embeddings exist
  console.log('📊 Checking embedding counts:');

  const { data: procCount } = await supabase
    .from('procedures')
    .select('id', { count: 'exact', head: true });

  const { data: procWithEmbed } = await supabase
    .from('procedures')
    .select('id', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { data: prodCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  const { data: prodWithEmbed } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  console.log(`   Procedures: ${procWithEmbed?.length || 0} have embeddings`);
  console.log(`   Products: ${prodWithEmbed?.length || 0} have embeddings\n`);

  // 2. Sample some actual embeddings
  console.log('📝 Sampling data:');

  const { data: sampleProc } = await supabase
    .from('procedures')
    .select('id, name, embedding')
    .not('embedding', 'is', null)
    .limit(1);

  if (sampleProc && sampleProc.length > 0) {
    console.log(`   ✅ Found procedure: ${sampleProc[0].name}`);
    console.log(`   Embedding exists: ${sampleProc[0].embedding ? 'YES' : 'NO'}`);
    console.log(`   Embedding length: ${sampleProc[0].embedding ? sampleProc[0].embedding.length : 0}`);
  } else {
    console.log(`   ❌ No procedures with embeddings found!`);
  }

  const { data: sampleProd } = await supabase
    .from('products')
    .select('id, name, embedding')
    .not('embedding', 'is', null)
    .limit(1);

  if (sampleProd && sampleProd.length > 0) {
    console.log(`   ✅ Found product: ${sampleProd[0].name}`);
    console.log(`   Embedding exists: ${sampleProd[0].embedding ? 'YES' : 'NO'}`);
    console.log(`   Embedding length: ${sampleProd[0].embedding ? sampleProd[0].embedding.length : 0}\n`);
  } else {
    console.log(`   ❌ No products with embeddings found!\n`);
  }

  // 3. Test vector search with VERY low threshold
  console.log('🔎 Testing vector search with low threshold (0.1):');

  const testQuery = 'gingivitis';
  console.log(`   Query: "${testQuery}"`);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: testQuery,
  });
  const queryEmbedding = response.data[0].embedding;

  const { data: vectorResults, error } = await supabase.rpc('match_procedures', {
    query_embedding: queryEmbedding,
    match_threshold: 0.1,  // Very low threshold
    match_count: 5
  });

  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
  } else {
    console.log(`   ✅ Found ${vectorResults?.length || 0} results`);
    if (vectorResults && vectorResults.length > 0) {
      vectorResults.forEach(r => {
        console.log(`      - ${r.name} (similarity: ${r.similarity.toFixed(3)})`);
      });
    }
  }

  console.log('\n✅ Test complete!');
}

testEmbeddings().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
