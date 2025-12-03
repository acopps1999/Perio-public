/**
 * Performance Benchmark Suite
 *
 * Measures performance of hybrid RAG vs old system.
 */

import { executeHybridRAG } from '../src/services/ai/hybridRagService.js';

// Sample benchmark queries
const benchmarkQueries = [
  'What products are used for gingivitis?', // Should be <300ms (structured)
  'Tell me about PerioChip', // Should be <300ms (structured)
  'Products for gum inflammation', // Should be <800ms (semantic)
  'Compare Arestin and PerioChip', // Should be <500ms (structured)
];

/**
 * Run performance benchmarks
 */
async function runBenchmarks() {
  console.log('⚡ Performance Benchmarks\n');

  const results = [];

  for (const query of benchmarkQueries) {
    console.log(`Testing: "${query}"`);

    // Run 3 times and average
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const metadata = await executeHybridRAG(
        query,
        () => {}, // No-op chunk handler
        {}
      );
      runs.push({
        duration: Date.now() - start,
        route: metadata.stages.routing?.route,
      });

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const avgDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length;
    const route = runs[0].route;

    console.log(`  Average: ${avgDuration.toFixed(0)}ms (${route} path)`);

    // Check against targets
    const target = route === 'structured' ? 500 : 1000;
    if (avgDuration <= target) {
      console.log(`  ✅ Within target (${target}ms)`);
    } else {
      console.log(`  ❌ Exceeded target by ${(avgDuration - target).toFixed(0)}ms`);
    }

    results.push({
      query,
      avgDuration,
      route,
      target,
      passed: avgDuration <= target,
    });

    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  console.log(`\n📊 Summary: ${passed}/${results.length} queries met performance targets`);

  return results;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks };
