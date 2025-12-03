/**
 * Agentic Search System - Integration Tests
 *
 * Tests the GPT-4o function calling system for database queries.
 * Requires:
 * - OpenAI API key (REACT_APP_OPENAI_API_KEY)
 * - Supabase connection (REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)
 * - Database populated with test data
 *
 * Run with: node tests/agenticSearch.test.js
 */

import { agenticSearch, checkAgenticSearchStatus } from '../src/services/ai/agenticSearchService.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper: Log test result
function logTest(name, passed, message = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${icon} ${name}${colors.reset}`);
  if (message) {
    console.log(`  ${colors.gray}${message}${colors.reset}`);
  }

  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

// Helper: Run a test query
async function runTest(name, query, expectations = {}) {
  console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);

  try {
    const functionCalls = [];
    let streamedText = '';

    const result = await agenticSearch(
      query,
      (chunk) => {
        streamedText += chunk;
      },
      (fc) => {
        functionCalls.push(fc);
        console.log(`  ${colors.gray}→ Called: ${fc.name}(${JSON.stringify(fc.arguments)})${colors.reset}`);
      }
    );

    // Check expectations
    let passed = true;
    let failureMessage = '';

    // Expectation: function calls
    if (expectations.minFunctionCalls && functionCalls.length < expectations.minFunctionCalls) {
      passed = false;
      failureMessage = `Expected at least ${expectations.minFunctionCalls} function calls, got ${functionCalls.length}`;
    }

    if (expectations.maxFunctionCalls && functionCalls.length > expectations.maxFunctionCalls) {
      passed = false;
      failureMessage = `Expected at most ${expectations.maxFunctionCalls} function calls, got ${functionCalls.length}`;
    }

    // Expectation: response contains keywords
    if (expectations.responseContains) {
      for (const keyword of expectations.responseContains) {
        if (!result.response.toLowerCase().includes(keyword.toLowerCase())) {
          passed = false;
          failureMessage = `Response missing expected keyword: "${keyword}"`;
          break;
        }
      }
    }

    // Expectation: execution time
    if (expectations.maxExecutionTime && result.executionTime > expectations.maxExecutionTime) {
      passed = false;
      failureMessage = `Execution took ${result.executionTime}ms (max: ${expectations.maxExecutionTime}ms)`;
    }

    // Expectation: successful function calls
    if (expectations.allFunctionsSucceed) {
      const failedCalls = result.functionCalls.filter((fc) => !fc.success);
      if (failedCalls.length > 0) {
        passed = false;
        failureMessage = `${failedCalls.length} function call(s) failed: ${failedCalls.map((fc) => fc.name).join(', ')}`;
      }
    }

    // Log results
    console.log(`  ${colors.gray}Response: ${result.response.substring(0, 100)}...${colors.reset}`);
    console.log(`  ${colors.gray}Function calls: ${result.functionCalls.length}${colors.reset}`);
    console.log(`  ${colors.gray}Execution time: ${result.executionTime}ms${colors.reset}`);
    console.log(`  ${colors.gray}Tokens: ${result.totalTokens}${colors.reset}`);

    logTest(name, passed, failureMessage);

    return { passed, result };
  } catch (error) {
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    logTest(name, false, error.message);
    return { passed: false, error };
  }
}

// Main test suite
async function runTests() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Agentic Search System - Integration Tests${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  // 0. Check configuration
  console.log(`${colors.yellow}Checking configuration...${colors.reset}`);
  const status = checkAgenticSearchStatus();
  if (!status.configured) {
    console.log(`${colors.red}✗ Configuration error: ${status.error}${colors.reset}`);
    console.log(`${colors.yellow}Please ensure environment variables are set:${colors.reset}`);
    console.log(`  - REACT_APP_OPENAI_API_KEY`);
    console.log(`  - REACT_APP_SUPABASE_URL`);
    console.log(`  - REACT_APP_SUPABASE_ANON_KEY`);
    process.exit(1);
  }
  console.log(`${colors.green}✓ Configuration OK${colors.reset}`);
  console.log(`  Model: ${status.model}`);

  // Test 1: Simple product search
  await runTest(
    'Simple product search',
    'What products contain chlorhexidine?',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      responseContains: ['product'],
      maxExecutionTime: 10000,
      allFunctionsSucceed: true,
    }
  );

  // Test 2: Procedure search with phase recommendations
  await runTest(
    'Procedure + phase recommendation',
    'What products are recommended for Type 2 gingivitis in the Acute phase?',
    {
      minFunctionCalls: 2,
      maxFunctionCalls: 5,
      responseContains: ['gingivitis', 'acute'],
      maxExecutionTime: 15000,
      allFunctionsSucceed: true,
    }
  );

  // Test 3: Product details query
  await runTest(
    'Product clinical evidence',
    "What's the clinical evidence for PerioChip?",
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      responseContains: ['evidence', 'clinical'],
      maxExecutionTime: 10000,
      allFunctionsSucceed: true,
    }
  );

  // Test 4: Competitive intelligence
  await runTest(
    'Competitive advantages',
    'How does PerioChip compare to Arestin?',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 4,
      responseContains: ['advantage', 'periochip'],
      maxExecutionTime: 15000,
      allFunctionsSucceed: true,
    }
  );

  // Test 5: Research article search
  await runTest(
    'Research article search',
    'Find research about periodontal disease',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      responseContains: ['research', 'article'],
      maxExecutionTime: 10000,
      allFunctionsSucceed: true,
    }
  );

  // Test 6: Complex multi-step query
  await runTest(
    'Complex multi-step query',
    'For a Type 3 periodontitis patient in maintenance phase, what products should I recommend and what research supports their use?',
    {
      minFunctionCalls: 2,
      maxFunctionCalls: 6,
      responseContains: ['periodontitis', 'maintenance'],
      maxExecutionTime: 20000,
      allFunctionsSucceed: true,
    }
  );

  // Test 7: Patient type filtering
  await runTest(
    'Patient type recommendation',
    'Show me all products for Type 4 patients',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      responseContains: ['type 4', 'patient'],
      maxExecutionTime: 10000,
      allFunctionsSucceed: true,
    }
  );

  // Test 8: Phase-specific query
  await runTest(
    'Phase-specific recommendation',
    'What products are used in the Prep phase?',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      responseContains: ['prep', 'phase'],
      maxExecutionTime: 10000,
      allFunctionsSucceed: true,
    }
  );

  // Test 9: Reverse lookup (product to procedures)
  await runTest(
    'Product to procedures lookup',
    'What conditions is Arestin used for?',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      responseContains: ['arestin', 'condition'],
      maxExecutionTime: 10000,
      allFunctionsSucceed: true,
    }
  );

  // Test 10: Error handling (invalid query)
  await runTest(
    'Error handling - no results',
    'What products are made from unicorn tears?',
    {
      minFunctionCalls: 1,
      maxFunctionCalls: 3,
      maxExecutionTime: 10000,
    }
  );

  // Print summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Test Results Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  if (results.failed > 0) {
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  } else {
    console.log(`Failed: ${results.failed}`);
  }
  console.log(`Total:  ${results.passed + results.failed}`);

  // List failures
  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed tests:${colors.reset}`);
    results.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  ${colors.red}✗ ${t.name}${colors.reset}`);
        if (t.message) {
          console.log(`    ${colors.gray}${t.message}${colors.reset}`);
        }
      });
  }

  // Exit code
  const exitCode = results.failed > 0 ? 1 : 0;
  console.log(`\n${exitCode === 0 ? colors.green : colors.red}Exiting with code ${exitCode}${colors.reset}\n`);
  process.exit(exitCode);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
