/**
 * Retry utility for database operations with exponential backoff
 *
 * Automatically retries failed operations with increasing delays between attempts.
 * Certain error types (like "not found" errors) are not retried.
 *
 * @module retry
 */

/**
 * Retry a database operation with exponential backoff
 *
 * Implements exponential backoff strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: Wait 1 second
 * - Attempt 3: Wait 2 seconds
 * - Attempt 4: Wait 4 seconds
 *
 * @param {Function} operation - Async function to retry
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @param {number} [baseDelay=1000] - Base delay in milliseconds (doubled each retry)
 * @returns {Promise<*>} Result of the successful operation
 * @throws {Error} Last error if all retries fail
 *
 * @example
 * const data = await withRetry(
 *   async () => supabase.from('procedures').select('*'),
 *   3,  // max 3 retries
 *   1000 // start with 1 second delay
 * );
 */
export const withRetry = async (
  operation,
  maxRetries = 3,
  baseDelay = 1000
) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain error codes
      if (error.code === 'PGRST116') {
        // PGRST116: Row not found - don't retry
        throw error;
      }

      if (error.code === '42P01') {
        // PostgreSQL: undefined_table - don't retry
        throw error;
      }

      if (error.code === '42703') {
        // PostgreSQL: undefined_column - don't retry
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt >= maxRetries - 1) {
        break;
      }

      // Calculate exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed, throw the last error
  throw lastError;
};
