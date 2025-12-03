/**
 * Hybrid RAG Test Suite
 *
 * Tests for the new hybrid RAG system.
 * Run these tests to validate the implementation.
 */

import { executeHybridRAG } from '../src/services/ai/hybridRagService.js';
import { RAG_CONFIG } from '../src/services/ai/ragConfig.js';

// Test queries categorized by type
const testQueries = {
  structured_procedure_to_product: [
    'What products are used for gingivitis?',
    'Show me products for periodontal surgery',
    'What do you recommend for implant placement?',
  ],

  structured_product_to_procedure: [
    'What is PerioChip used for?',
    'Tell me about Arestin',
    'What conditions does Atridox treat?',
  ],

  structured_product_details: [
    'What is the clinical evidence for PerioChip?',
    'Give me the pitch points for Arestin',
    'Tell me about the rationale for using Atridox',
  ],

  semantic_fuzzy: [
    'Products for gum disease',
    'Best treatment for oral bacteria',
    'What helps with inflammation?',
    'Something for infection control',
  ],

  semantic_exploratory: [
    'Tell me about chlorhexidine',
    'What research exists on antimicrobials?',
    'Products with strong clinical evidence',
  ],

  comparison: [
    'Compare PerioChip and Arestin',
    'What is the difference between local and systemic antibiotics?',
  ],
};

/**
 * Run test suite
 */
async function runTests() {
  console.log('🧪 Starting Hybrid RAG Test Suite\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    performanceIssues: 0,
    tests: [],
  };

  // Test each category
  for (const [category, queries] of Object.entries(testQueries)) {
    console.log(`\n📋 Testing ${category}...`);

    for (const query of queries) {
      results.total++;

      console.log(`\n   Query: "${query}"`);

      let response = '';
      const metadata = await executeHybridRAG(
        query,
        (chunk) => { response += chunk; },
        {}
      );

      // Evaluate results
      const testResult = {
        query,
        category,
        success: metadata.success,
        duration: metadata.totalDuration,
        route: metadata.stages.routing?.route,
        intent: metadata.stages.routing?.intent,
        resultCount: metadata.stages.retrieval?.resultCount || 0,
        responseLength: response.length,
        performanceTarget: metadata.performanceTarget,
      };

      if (metadata.success) {
        results.passed++;
        console.log(`   ✅ PASSED (${metadata.totalDuration}ms)`);
        console.log(`      Route: ${metadata.stages.routing?.route}`);
        console.log(`      Results: ${metadata.stages.retrieval?.resultCount}`);

        if (!metadata.performanceTarget) {
          results.performanceIssues++;
          console.log(`      ⚠️  Exceeded performance target`);
        }
      } else {
        results.failed++;
        console.log(`   ❌ FAILED`);
        console.log(`      Errors: ${metadata.errors.join(', ')}`);
      }

      results.tests.push(testResult);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Print summary
  console.log('\n\n📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Performance Issues: ${results.performanceIssues}`);

  // Performance stats
  const durations = results.tests.map(t => t.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  console.log('\nPerformance:');
  console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min: ${minDuration}ms`);
  console.log(`  Max: ${maxDuration}ms`);
  console.log(`  Target: ${RAG_CONFIG.TARGET_RESPONSE_TIME}ms`);

  // Route distribution
  const routeCounts = {};
  results.tests.forEach(t => {
    routeCounts[t.route] = (routeCounts[t.route] || 0) + 1;
  });

  console.log('\nRoute Distribution:');
  Object.entries(routeCounts).forEach(([route, count]) => {
    console.log(`  ${route}: ${count} (${((count / results.total) * 100).toFixed(1)}%)`);
  });

  return results;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
