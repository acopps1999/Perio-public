import dotenv from 'dotenv';
import { retrieveContext } from '../src/services/ai/ragService.js';
import { RAG_CONFIG } from '../src/services/ai/ragConfig.js';

dotenv.config({ path: '.env.local' });

const TEST_CASES = [
  {
    description: 'Product -> Procedure: What conditions is AO ProVantage used for?',
    query: 'What conditions is AO ProVantage used for?',
    assertions: [
      {
        name: 'Should retrieve at least one procedure',
        test: (context) => context.procedures.length > 0,
      },
      {
        name: 'Should have "Gingivitis" in the procedures',
        test: (context) => context.procedures.some(p => p.name.includes('Gingivitis')),
      },
      {
        name: 'Should not retrieve any products directly from semantic search',
        test: (context) => {
          const semanticProducts = context.products.filter(p => p.found_in && p.found_in.includes('hybrid'));
          return semanticProducts.length === 0;
        }
      }
    ],
  },
  {
    description: 'Procedure -> Product: What products for General Daily Oral Hygiene?',
    query: 'What products for General Daily Oral Hygiene?',
    assertions: [
      {
        name: 'Should retrieve at least one procedure',
        test: (context) => context.procedures.length > 0,
      },
      {
        name: 'Should have "General Daily Oral Hygiene" in the procedures',
        test: (context) => context.procedures.some(p => p.name.includes('General Daily Oral Hygiene')),
      },
      {
        name: 'Should retrieve at least one related product',
        test: (context) => context.products.length > 0,
      },
      {
        name: 'Should have "AO ProToothpaste" among the products',
        test: (context) => context.products.some(p => p.product_name.includes('AO ProToothpaste')),
      }
    ],
  },
  {
    description: 'Metadata Query: What are the phases for Gingivitis?',
    query: 'What are the phases for Gingivitis?',
    assertions: [
      {
        name: 'Should be identified as a metadata query',
        test: (context) => context.isMetadataQuery,
      },
      {
        name: 'Should identify "Gingivitis" as the procedure',
        test: (context) => context.procedure.name.includes('Gingivitis'),
      },
      {
        name: 'Should retrieve metadata values',
        test: (context) => context.metadataValues.length > 0,
      },
      {
        name: 'Should include phase values (Early, Moderate, or Severe)',
        test: (context) => context.metadataValues.some(val => ['Early', 'Moderate', 'Severe', 'Acute', 'Maintenance'].includes(val)),
      }
    ],
  },
];

async function runTests() {
  console.log('--- Starting RAG Pipeline Test Suite ---');
  console.log(`Using MIN_PROCEDURE_SIMILARITY: ${RAG_CONFIG.MIN_PROCEDURE_SIMILARITY}`);
  console.log('\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`--- Running test: "${testCase.description}" ---`);
    const context = await retrieveContext(testCase.query);

    let testCaseFailed = false;
    for (const assertion of testCase.assertions) {
      const result = assertion.test(context);
      if (result) {
        console.log(`✅ PASSED: ${assertion.name}`);
      } else {
        console.log(`❌ FAILED: ${assertion.name}`);
        testCaseFailed = true;
      }
    }

    if (testCaseFailed) {
      failed++;
      console.log('--- Test Details ---');
      console.log('Retrieved Procedures:', context.procedures.map(p => ({ name: p.name, similarity: p.similarity })));
      console.log('Retrieved Products:', context.products.map(p => ({ name: p.product_name, similarity: p.similarity })));
      console.log('Total procedures:', context.procedures.length);
      console.log('Total products:', context.products.length);
      if(context.isMetadataQuery) {
        console.log('Metadata Query:', context.isMetadataQuery);
        console.log('Metadata Type:', context.metadataType);
        console.log('Metadata Values:', context.metadataValues);
      }
      console.log('\n');
    } else {
      passed++;
      console.log('\n');
    }
  }

  console.log('--- Test Summary ---');
  console.log(`Total tests: ${TEST_CASES.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('--- End of Test Suite ---');

  return failed === 0;
}

runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test suite crashed:', err);
    process.exit(1);
  });
