/**
 * Feature Visibility System - Unit Tests
 *
 * Tests the role-based feature access control system.
 * Run with: node tests/featureVisibility.test.js
 */

import {
  FEATURE_VISIBILITY,
  hasFeatureAccess,
  getAccessibleFeatures,
  getRolesForFeature,
  isSalesOnlyFeature
} from '../src/config/featureVisibility.js';

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

// Helper: Assert truthy
function assertTrue(actual, testName) {
  const passed = actual === true;
  logTest(testName, passed, passed ? '' : `Expected: true, Got: ${actual}`);
  return passed;
}

// Helper: Assert falsy
function assertFalse(actual, testName) {
  const passed = actual === false;
  logTest(testName, passed, passed ? '' : `Expected: false, Got: ${actual}`);
  return passed;
}

// ========== TESTS ==========

console.log(`\n${colors.cyan}=== Feature Visibility Tests ===${colors.reset}\n`);

// Test 1: FEATURE_VISIBILITY config exists
console.log(`${colors.yellow}Testing FEATURE_VISIBILITY config...${colors.reset}`);
logTest('FEATURE_VISIBILITY is defined', typeof FEATURE_VISIBILITY === 'object');
logTest('Has product_recommendations feature', Array.isArray(FEATURE_VISIBILITY.product_recommendations));
logTest('Has competitive_advantage feature', Array.isArray(FEATURE_VISIBILITY.competitive_advantage));
logTest('Has admin_panel feature', Array.isArray(FEATURE_VISIBILITY.admin_panel));

// Test 2: hasFeatureAccess function
console.log(`\n${colors.yellow}Testing hasFeatureAccess()...${colors.reset}`);

// Admin should have access to everything
assertTrue(hasFeatureAccess('product_recommendations', 'admin'), 'Admin can access product_recommendations');
assertTrue(hasFeatureAccess('competitive_advantage', 'admin'), 'Admin can access competitive_advantage');
assertTrue(hasFeatureAccess('admin_panel', 'admin'), 'Admin can access admin_panel');
assertTrue(hasFeatureAccess('drawer_competitive_tab', 'admin'), 'Admin can access drawer_competitive_tab');

// Sales should have access to sales features but not admin
assertTrue(hasFeatureAccess('product_recommendations', 'sales'), 'Sales can access product_recommendations');
assertTrue(hasFeatureAccess('competitive_advantage', 'sales'), 'Sales can access competitive_advantage');
assertTrue(hasFeatureAccess('objection_handling', 'sales'), 'Sales can access objection_handling');
assertTrue(hasFeatureAccess('pitch_points', 'sales'), 'Sales can access pitch_points');
assertFalse(hasFeatureAccess('admin_panel', 'sales'), 'Sales cannot access admin_panel');

// Clinician should only have access to clinical features
assertTrue(hasFeatureAccess('product_recommendations', 'clinician'), 'Clinician can access product_recommendations');
assertTrue(hasFeatureAccess('clinical_evidence', 'clinician'), 'Clinician can access clinical_evidence');
assertTrue(hasFeatureAccess('research_articles', 'clinician'), 'Clinician can access research_articles');
assertFalse(hasFeatureAccess('competitive_advantage', 'clinician'), 'Clinician cannot access competitive_advantage');
assertFalse(hasFeatureAccess('objection_handling', 'clinician'), 'Clinician cannot access objection_handling');
assertFalse(hasFeatureAccess('pitch_points', 'clinician'), 'Clinician cannot access pitch_points');
assertFalse(hasFeatureAccess('admin_panel', 'clinician'), 'Clinician cannot access admin_panel');

// Edge cases
assertFalse(hasFeatureAccess('product_recommendations', null), 'Null role returns false');
assertFalse(hasFeatureAccess('product_recommendations', undefined), 'Undefined role returns false');
assertFalse(hasFeatureAccess('product_recommendations', ''), 'Empty string role returns false');
assertTrue(hasFeatureAccess('unknown_feature', 'admin'), 'Unknown feature defaults to true (fail open)');

// Test 3: getAccessibleFeatures function
console.log(`\n${colors.yellow}Testing getAccessibleFeatures()...${colors.reset}`);

const adminFeatures = getAccessibleFeatures('admin');
logTest('Admin has access to multiple features', adminFeatures.length > 10);
logTest('Admin features include admin_panel', adminFeatures.includes('admin_panel'));
logTest('Admin features include competitive_advantage', adminFeatures.includes('competitive_advantage'));

const salesFeatures = getAccessibleFeatures('sales');
logTest('Sales has fewer features than admin', salesFeatures.length < adminFeatures.length);
logTest('Sales features include competitive_advantage', salesFeatures.includes('competitive_advantage'));
logTest('Sales features do NOT include admin_panel', !salesFeatures.includes('admin_panel'));

const clinicianFeatures = getAccessibleFeatures('clinician');
logTest('Clinician has fewer features than sales', clinicianFeatures.length < salesFeatures.length);
logTest('Clinician features include clinical_evidence', clinicianFeatures.includes('clinical_evidence'));
logTest('Clinician features do NOT include competitive_advantage', !clinicianFeatures.includes('competitive_advantage'));

const noRoleFeatures = getAccessibleFeatures(null);
assertEqual(noRoleFeatures, [], 'Null role returns empty array');

// Test 4: getRolesForFeature function
console.log(`\n${colors.yellow}Testing getRolesForFeature()...${colors.reset}`);

const productRecommendationRoles = getRolesForFeature('product_recommendations');
logTest('product_recommendations available to all 3 roles', productRecommendationRoles.length === 3);

const competitiveAdvantageRoles = getRolesForFeature('competitive_advantage');
logTest('competitive_advantage available to admin and sales only',
  competitiveAdvantageRoles.length === 2 &&
  competitiveAdvantageRoles.includes('admin') &&
  competitiveAdvantageRoles.includes('sales'));

const adminPanelRoles = getRolesForFeature('admin_panel');
logTest('admin_panel available to admin only',
  adminPanelRoles.length === 1 && adminPanelRoles.includes('admin'));

const unknownFeatureRoles = getRolesForFeature('unknown_feature');
assertEqual(unknownFeatureRoles, [], 'Unknown feature returns empty array');

// Test 5: isSalesOnlyFeature function
console.log(`\n${colors.yellow}Testing isSalesOnlyFeature()...${colors.reset}`);

assertTrue(isSalesOnlyFeature('competitive_advantage'), 'competitive_advantage is sales-only');
assertTrue(isSalesOnlyFeature('objection_handling'), 'objection_handling is sales-only');
assertTrue(isSalesOnlyFeature('pitch_points'), 'pitch_points is sales-only');
assertFalse(isSalesOnlyFeature('product_recommendations'), 'product_recommendations is NOT sales-only');
assertFalse(isSalesOnlyFeature('admin_panel'), 'admin_panel is NOT sales-only (admin only)');
assertFalse(isSalesOnlyFeature('unknown_feature'), 'Unknown feature is NOT sales-only');

// Test 6: ProductDrawer tabs visibility
console.log(`\n${colors.yellow}Testing ProductDrawer tab visibility...${colors.reset}`);

// Admin sees all tabs
assertTrue(hasFeatureAccess('drawer_usage_tab', 'admin'), 'Admin sees usage tab');
assertTrue(hasFeatureAccess('drawer_scientific_tab', 'admin'), 'Admin sees scientific tab');
assertTrue(hasFeatureAccess('drawer_clinical_tab', 'admin'), 'Admin sees clinical tab');
assertTrue(hasFeatureAccess('drawer_competitive_tab', 'admin'), 'Admin sees competitive tab');
assertTrue(hasFeatureAccess('drawer_objection_tab', 'admin'), 'Admin sees objection tab');
assertTrue(hasFeatureAccess('drawer_pitch_tab', 'admin'), 'Admin sees pitch tab');

// Sales sees all tabs
assertTrue(hasFeatureAccess('drawer_usage_tab', 'sales'), 'Sales sees usage tab');
assertTrue(hasFeatureAccess('drawer_competitive_tab', 'sales'), 'Sales sees competitive tab');
assertTrue(hasFeatureAccess('drawer_pitch_tab', 'sales'), 'Sales sees pitch tab');

// Clinician sees only clinical tabs
assertTrue(hasFeatureAccess('drawer_usage_tab', 'clinician'), 'Clinician sees usage tab');
assertTrue(hasFeatureAccess('drawer_scientific_tab', 'clinician'), 'Clinician sees scientific tab');
assertTrue(hasFeatureAccess('drawer_clinical_tab', 'clinician'), 'Clinician sees clinical tab');
assertFalse(hasFeatureAccess('drawer_competitive_tab', 'clinician'), 'Clinician does NOT see competitive tab');
assertFalse(hasFeatureAccess('drawer_objection_tab', 'clinician'), 'Clinician does NOT see objection tab');
assertFalse(hasFeatureAccess('drawer_pitch_tab', 'clinician'), 'Clinician does NOT see pitch tab');

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
