#!/usr/bin/env node
/**
 * Quick test script to verify OpenAI API connection
 * Run with: node scripts/test-openai-connection.js
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

console.log('🧪 Testing OpenAI Connection\n');

// Check API key
const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ REACT_APP_OPENAI_API_KEY not found in .env.local');
  console.log('\nAdd this to .env.local:');
  console.log('REACT_APP_OPENAI_API_KEY=sk-your-key-here\n');
  process.exit(1);
}

if (!apiKey.startsWith('sk-')) {
  console.error('❌ Invalid API key format (should start with sk-)');
  process.exit(1);
}

console.log('✅ API key found:', apiKey.substring(0, 10) + '...\n');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });

async function testEmbedding() {
  console.log('📊 Testing embedding generation...');

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'periodontal surgery',
    });

    const embedding = response.data[0].embedding;
    console.log('✅ Embedding generated successfully!');
    console.log(`   - Dimensions: ${embedding.length}`);
    console.log(`   - First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   - Model: ${response.model}`);
    console.log(`   - Usage: ${response.usage.total_tokens} tokens\n`);

    return true;
  } catch (error) {
    console.error('❌ Embedding test failed:', error.message);
    if (error.status === 401) {
      console.log('\n💡 Tip: Your API key may be invalid or expired');
      console.log('   Get a new key at: https://platform.openai.com/api-keys\n');
    }
    return false;
  }
}

async function testChatCompletion() {
  console.log('💬 Testing chat completion...');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: 'Say "Hello!" if you can read this.',
        },
      ],
      max_tokens: 10,
    });

    const message = response.choices[0].message.content;
    console.log('✅ Chat completion successful!');
    console.log(`   - Response: "${message}"`);
    console.log(`   - Model: ${response.model}`);
    console.log(`   - Usage: ${response.usage.total_tokens} tokens (prompt: ${response.usage.prompt_tokens}, completion: ${response.usage.completion_tokens})\n`);

    return true;
  } catch (error) {
    console.error('❌ Chat completion test failed:', error.message);
    if (error.status === 401) {
      console.log('\n💡 Tip: Your API key may be invalid or expired');
      console.log('   Get a new key at: https://platform.openai.com/api-keys\n');
    }
    return false;
  }
}

async function estimateCosts() {
  console.log('💰 Cost Estimates for Your App:\n');

  // Embedding costs
  const proceduresCount = 100; // Estimate
  const productsCount = 50;    // Estimate
  const researchCount = 200;   // Estimate
  const totalRecords = proceduresCount + productsCount + researchCount;
  const avgTokensPerRecord = 100;
  const embeddingCostPer1K = 0.00002;

  const embeddingCost = (totalRecords * avgTokensPerRecord / 1000) * embeddingCostPer1K;

  console.log('One-time Embedding Generation:');
  console.log(`   - ${totalRecords} records × ${avgTokensPerRecord} tokens/record`);
  console.log(`   - Total: ${totalRecords * avgTokensPerRecord} tokens`);
  console.log(`   - Cost: $${embeddingCost.toFixed(4)}\n`);

  // Query costs
  const queriesPerMonth = 1000; // Estimate
  const tokensPerQuery = 2000;  // Estimate (includes context + response)
  const chatCostPer1K = 0.01;   // GPT-4 Turbo

  const monthlyChatCost = (queriesPerMonth * tokensPerQuery / 1000) * chatCostPer1K;

  console.log('Monthly Query Costs:');
  console.log(`   - ${queriesPerMonth} queries × ${tokensPerQuery} tokens/query`);
  console.log(`   - Total: ${queriesPerMonth * tokensPerQuery} tokens`);
  console.log(`   - Cost: $${monthlyChatCost.toFixed(2)}\n`);

  console.log('Total Estimated Monthly Cost: $' + (monthlyChatCost).toFixed(2));
  console.log('(Embedding is one-time, query cost repeats monthly)\n');
}

// Run all tests
async function runTests() {
  const embeddingSuccess = await testEmbedding();
  const chatSuccess = await testChatCompletion();

  if (embeddingSuccess && chatSuccess) {
    console.log('🎉 All tests passed! OpenAI connection is working.\n');
    await estimateCosts();
    console.log('✅ Ready to deploy RAG functions and generate embeddings!');
    console.log('📖 See RAG_DEPLOYMENT_GUIDE.md for next steps\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Fix the issues above before proceeding.\n');
    process.exit(1);
  }
}

runTests();
