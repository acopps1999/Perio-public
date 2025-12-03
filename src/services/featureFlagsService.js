/**
 * Feature Flags Service
 *
 * Provides centralized access to feature flags stored in the database.
 * Includes caching to avoid repeated database queries.
 */

import { supabase } from '../supabaseClient';

// Cache for feature flags (refreshed every 5 minutes)
let flagsCache = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all feature flags from database
 * Uses 5-minute cache to reduce database load
 */
async function fetchFeatureFlags() {
  const now = Date.now();

  // Return cached flags if still valid
  if (flagsCache && now < cacheExpiry) {
    return flagsCache;
  }

  try {
    // Fetch active feature flags
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('active', true); // Only fetch enabled flags

    if (error) {
      console.error('❌ [Feature Flags] Error fetching flags:', error);
      return flagsCache || {}; // Return stale cache on error
    }

    // Convert array to key-value map
    const flags = {};
    (data || []).forEach(flag => {
      flags[flag.feature] = {
        enabled: flag.active !== undefined ? flag.active : true, // Use 'active' column
        numericValue: flag.numeric_value !== undefined ? flag.numeric_value : null,
        textValue: flag.text_value !== undefined ? flag.text_value : null,
        description: flag.description || ''
      };
    });

    // Update cache
    flagsCache = flags;
    cacheExpiry = now + CACHE_DURATION;

    return flags;

  } catch (err) {
    console.error('❌ [Feature Flags] Exception fetching flags:', err);
    return flagsCache || {};
  }
}

/**
 * Get a specific feature flag value
 *
 * @param {string} flagName - Name of the feature flag
 * @param {*} defaultValue - Default value if flag not found
 * @returns {Promise<*>} Flag value (numeric, text, or boolean)
 */
export async function getFeatureFlag(flagName, defaultValue = null) {
  const flags = await fetchFeatureFlags();
  const flag = flags[flagName];

  if (!flag) {
    return defaultValue;
  }

  // Return numeric value if present, otherwise text value, otherwise boolean
  if (flag.numericValue !== null && flag.numericValue !== undefined) {
    return flag.numericValue;
  }
  if (flag.textValue !== null && flag.textValue !== undefined) {
    return flag.textValue;
  }
  return flag.enabled;
}

/**
 * Get vector search threshold from feature flags
 * Defaults to 0.3 if not configured
 */
export async function getVectorSearchThreshold() {
  return await getFeatureFlag('vector_search_threshold', 0.3);
}

/**
 * Get text search threshold from feature flags
 * Defaults to 0.05 if not configured
 */
export async function getTextSearchThreshold() {
  return await getFeatureFlag('text_search_threshold', 0.05);
}

/**
 * Check if AI chatbot is enabled
 * Defaults to true if not configured
 */
export async function isAIChatbotEnabled() {
  return await getFeatureFlag('ai_chatbot_enabled', true);
}

/**
 * Check if feedback widget is enabled
 * Defaults to true if not configured
 */
export async function isFeedbackWidgetEnabled() {
  return await getFeatureFlag('feedback_widget_enabled', true);
}

/**
 * Invalidate the cache (force refresh on next call)
 * Useful after updating feature flags in admin panel
 */
export function invalidateFeatureFlagsCache() {
  flagsCache = null;
  cacheExpiry = 0;
  console.log('🔄 [Feature Flags] Cache invalidated');
}

/**
 * Get all feature flags (for admin panel display)
 */
export async function getAllFeatureFlags() {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('feature');

    if (error) {
      console.error('❌ [Feature Flags] Error fetching all flags:', error);
      return [];
    }

    return data || [];

  } catch (err) {
    console.error('❌ [Feature Flags] Exception fetching all flags:', err);
    return [];
  }
}

/**
 * Update a feature flag value
 *
 * @param {string} flagName - Name of the feature flag
 * @param {Object} updates - Values to update {active, numeric_value, text_value}
 */
export async function updateFeatureFlag(flagName, updates) {
  try {
    const { error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('feature', flagName);

    if (error) {
      console.error('❌ [Feature Flags] Error updating flag:', error);
      return { success: false, error };
    }

    // Invalidate cache after update
    invalidateFeatureFlagsCache();

    return { success: true };

  } catch (err) {
    console.error('❌ [Feature Flags] Exception updating flag:', err);
    return { success: false, error: err };
  }
}
