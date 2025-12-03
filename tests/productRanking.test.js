/**
 * Product Ranking System - Unit Tests
 *
 * Tests the Phase 3 product ranking logic in the procedure transformer.
 * Run with: node tests/productRanking.test.js
 */

import { _testing } from '../src/services/database/transformers/procedureTransformer.js';

const { buildRankedProducts, buildProductDetailsMap, buildResearchMap } = _testing;

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

// Helper: Assert equality
function assertEqual(actual, expected, testName) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  logTest(testName, passed, passed ? '' : `Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  return passed;
}

// Helper: Assert array order
function assertArrayOrder(actual, expected, testName) {
  const passed = actual.length === expected.length &&
    actual.every((item, index) => item === expected[index]);
  logTest(testName, passed, passed ? '' : `Expected order: ${expected.join(', ')}, Got: ${actual.join(', ')}`);
  return passed;
}

// ========== TESTS ==========

console.log(`\n${colors.cyan}=== Product Ranking Tests ===${colors.reset}\n`);

// Test 1: buildRankedProducts - basic ranking
console.log(`${colors.yellow}Testing buildRankedProducts()...${colors.reset}`);

const mockPhaseProducts = [
  { phase_name: 'Prep', product_name: 'Product C', rank: 3 },
  { phase_name: 'Prep', product_name: 'Product A', rank: 1 },
  { phase_name: 'Prep', product_name: 'Product B', rank: 2 },
  { phase_name: 'Acute', product_name: 'Product D', rank: 1 },
  { phase_name: 'Acute', product_name: 'Product E', rank: 2 },
  { phase_name: 'Maintenance', product_name: 'Product F', rank: 1 },
];

const mockPhasesWithIds = [
  { id: 1, name: 'Prep' },
  { id: 2, name: 'Acute' },
  { id: 3, name: 'Maintenance' },
];

const rankedProducts = buildRankedProducts(mockPhaseProducts, mockPhasesWithIds);

logTest('Returns object with all phases',
  Object.keys(rankedProducts).length === 3 &&
  'Prep' in rankedProducts &&
  'Acute' in rankedProducts &&
  'Maintenance' in rankedProducts
);

assertArrayOrder(rankedProducts['Prep'], ['Product A', 'Product B', 'Product C'],
  'Prep phase products sorted by rank (1, 2, 3)');

assertArrayOrder(rankedProducts['Acute'], ['Product D', 'Product E'],
  'Acute phase products sorted by rank (1, 2)');

assertArrayOrder(rankedProducts['Maintenance'], ['Product F'],
  'Maintenance phase has single product');

// Test 2: buildRankedProducts - handles duplicates
console.log(`\n${colors.yellow}Testing duplicate handling...${colors.reset}`);

const duplicatePhaseProducts = [
  { phase_name: 'Prep', product_name: 'Product A', rank: 1 },
  { phase_name: 'Prep', product_name: 'Product A', rank: 2 }, // Duplicate
  { phase_name: 'Prep', product_name: 'Product B', rank: 3 },
];

const noDuplicates = buildRankedProducts(duplicatePhaseProducts, [{ id: 1, name: 'Prep' }]);
logTest('Removes duplicate products', noDuplicates['Prep'].length === 2);

// Test 3: buildRankedProducts - handles missing ranks
console.log(`\n${colors.yellow}Testing missing rank handling...${colors.reset}`);

const missingRankProducts = [
  { phase_name: 'Prep', product_name: 'Product A', rank: 1 },
  { phase_name: 'Prep', product_name: 'Product B' }, // No rank - should default to 999
  { phase_name: 'Prep', product_name: 'Product C', rank: 2 },
];

const withDefaultRanks = buildRankedProducts(missingRankProducts, [{ id: 1, name: 'Prep' }]);
assertArrayOrder(withDefaultRanks['Prep'], ['Product A', 'Product C', 'Product B'],
  'Products without rank appear last (default 999)');

// Test 4: buildRankedProducts - empty input
console.log(`\n${colors.yellow}Testing empty input handling...${colors.reset}`);

const emptyProducts = buildRankedProducts([], mockPhasesWithIds);
logTest('Empty product array returns phases with empty arrays',
  Object.keys(emptyProducts).length === 3 &&
  emptyProducts['Prep'].length === 0 &&
  emptyProducts['Acute'].length === 0 &&
  emptyProducts['Maintenance'].length === 0
);

const nullProducts = buildRankedProducts(null, mockPhasesWithIds);
logTest('Null product array returns phases with empty arrays',
  Object.keys(nullProducts).length === 3 &&
  nullProducts['Prep'].length === 0
);

// Test 5: buildProductDetailsMap
console.log(`\n${colors.yellow}Testing buildProductDetailsMap()...${colors.reset}`);

const mockProductDetails = [
  {
    product_id: 1,
    product_name: 'Product A',
    scientific_rationale: 'Scientific rationale for A',
    clinical_evidence: 'Clinical evidence for A',
    objection_handling: 'Objection handling for A',
    pitch_points: 'Pitch points for A',
    rationale: 'Rationale for A',
    fact_sheet_url: 'https://example.com/a'
  },
  {
    product_id: 2,
    product_name: 'Product B',
    scientific_rationale: 'Scientific rationale for B',
    clinical_evidence: null,
    objection_handling: '',
    pitch_points: 'Pitch points for B',
    rationale: 'Rationale for B',
    fact_sheet_url: null
  }
];

const mockPhaseUsage = [
  { product_id: 1, phase_name: 'Prep', instructions: 'Use in prep phase' },
  { product_id: 1, phase_name: 'Acute', instructions: 'Use in acute phase' },
  { product_id: 2, phase_name: 'Prep', instructions: 'Product B prep instructions' }
];

const mockResearch = [
  { product_id: 1, title: 'Study 1', author: 'Dr. Smith', abstract: 'Abstract 1', url: 'https://study1.com' },
  { product_id: 1, title: 'Study 2', author: 'Dr. Jones', abstract: 'Abstract 2', url: 'https://study2.com' }
];

const productDetailsMap = buildProductDetailsMap(mockProductDetails, mockPhaseUsage, mockResearch);

logTest('Creates map with both products',
  'Product A' in productDetailsMap && 'Product B' in productDetailsMap);

logTest('Product A has all fields populated',
  productDetailsMap['Product A'].scientificRationale === 'Scientific rationale for A' &&
  productDetailsMap['Product A'].clinicalEvidence === 'Clinical evidence for A' &&
  productDetailsMap['Product A'].handlingObjections === 'Objection handling for A' &&
  productDetailsMap['Product A'].pitchPoints === 'Pitch points for A'
);

logTest('Product A has usage instructions by phase',
  productDetailsMap['Product A'].usage['Prep'] === 'Use in prep phase' &&
  productDetailsMap['Product A'].usage['Acute'] === 'Use in acute phase'
);

logTest('Product A has research articles',
  productDetailsMap['Product A'].researchArticles.length === 2
);

logTest('Product B has empty strings for null/missing fields',
  productDetailsMap['Product B'].clinicalEvidence === '' &&
  productDetailsMap['Product B'].handlingObjections === '' &&
  productDetailsMap['Product B'].factSheetUrl === ''
);

// Test 6: buildResearchMap
console.log(`\n${colors.yellow}Testing buildResearchMap()...${colors.reset}`);

const researchMap = buildResearchMap(mockResearch, mockProductDetails);

logTest('Creates map keyed by product name', 'Product A' in researchMap);
logTest('Product A has 2 research articles', researchMap['Product A']?.length === 2);
logTest('Research articles have correct structure',
  researchMap['Product A'][0].title === 'Study 1' &&
  researchMap['Product A'][0].author === 'Dr. Smith' &&
  researchMap['Product A'][0].url === 'https://study1.com'
);

// Test 7: Empty research handling
const emptyResearchMap = buildResearchMap([], mockProductDetails);
logTest('Empty research array returns empty map', Object.keys(emptyResearchMap).length === 0);

// ========== SUMMARY ==========
console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
console.log(`Total: ${results.passed + results.failed}`);

if (results.failed > 0) {
  console.log(`\n${colors.red}Failed tests:${colors.reset}`);
  results.tests
    .filter(t => !t.passed)
    .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  process.exit(1);
} else {
  console.log(`\n${colors.green}All tests passed!${colors.reset}`);
  process.exit(0);
}
