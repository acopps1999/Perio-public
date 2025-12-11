/**
 * Feature Visibility Configuration
 * Defines which user roles can access specific features
 *
 * Roles:
 * - admin: Full access to all features
 * - sales: Sales-focused features + clinical evidence
 * - clinician: Clinical evidence only (no sales features)
 */

export const FEATURE_VISIBILITY = {
  // Universal features (all roles)
  product_recommendations: ['admin', 'sales', 'clinician'],
  clinical_evidence: ['admin', 'sales', 'clinician'],
  research_articles: ['admin', 'sales', 'clinician'],
  therapeutic_wizard: ['admin', 'sales', 'clinician'],

  // Sales-only features (hidden from clinicians)
  objection_handling: ['admin', 'sales'],
  pitch_points: ['admin', 'sales'],

  // Available to all roles
  competitive_advantage: ['admin', 'sales', 'clinician'],

  // Admin-only features
  admin_panel: ['admin'],
  user_management: ['admin'],
  product_management: ['admin'],
  condition_management: ['admin'],

  // Feature tabs in ProductDrawer
  drawer_usage_tab: ['admin', 'sales', 'clinician'],
  drawer_scientific_tab: ['admin', 'sales', 'clinician'],
  drawer_clinical_tab: ['admin', 'sales', 'clinician'],
  drawer_competitive_tab: ['admin', 'sales', 'clinician'],
  drawer_objection_tab: ['admin', 'sales'],
  drawer_pitch_tab: ['admin', 'sales'],
};

/**
 * Check if user has access to a feature
 * @param {string} feature - Feature key from FEATURE_VISIBILITY
 * @param {string} userRole - User's role (admin, sales, clinician)
 * @returns {boolean} - Whether user has access
 */
export function hasFeatureAccess(feature, userRole) {
  if (!userRole) return false;

  if (!FEATURE_VISIBILITY[feature]) {
    // If feature not in config, default to allowing (fail open for unknown features)
    console.warn(`Feature "${feature}" not found in visibility config`);
    return true;
  }

  return FEATURE_VISIBILITY[feature].includes(userRole);
}

/**
 * Get all features accessible by a role
 * @param {string} userRole - User's role
 * @returns {string[]} - Array of accessible feature keys
 */
export function getAccessibleFeatures(userRole) {
  if (!userRole) return [];

  return Object.keys(FEATURE_VISIBILITY).filter(feature =>
    FEATURE_VISIBILITY[feature].includes(userRole)
  );
}

/**
 * Get roles that can access a feature
 * @param {string} feature - Feature key
 * @returns {string[]} - Array of roles that can access the feature
 */
export function getRolesForFeature(feature) {
  return FEATURE_VISIBILITY[feature] || [];
}

/**
 * Check if a feature is sales-only (not available to clinicians)
 * @param {string} feature - Feature key
 * @returns {boolean}
 */
export function isSalesOnlyFeature(feature) {
  const roles = FEATURE_VISIBILITY[feature];
  if (!roles) return false;
  return roles.includes('sales') && !roles.includes('clinician');
}

export default FEATURE_VISIBILITY;
