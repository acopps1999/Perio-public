/**
 * Database Service Main Export
 *
 * Central export point for all database operations.
 * Provides a clean, organized API for accessing database functionality.
 *
 * Usage:
 *   import { fetchAllProcedures, fetchProductById } from 'services/database';
 */

// Export client
export { supabase, default as client } from './client.js';

// Export query functions
export * from './queries/procedures.js';
export * from './queries/products.js';
export * from './queries/categories.js';
export * from './queries/admin.js';

// Export transformers
export * from './transformers/procedureTransformer.js';
export * from './transformers/productTransformer.js';

// Export error classes
export * from './errors/DatabaseError.js';

// Export utility functions
export * from './utils/retry.js';
export * from './utils/timeout.js';
