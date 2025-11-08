/**
 * Timeout utility for database operations
 *
 * Wraps any promise with a timeout to prevent operations from hanging indefinitely.
 * Useful for preventing slow queries from blocking the application.
 *
 * @module timeout
 */

/**
 * Add timeout to any promise
 *
 * Races the provided promise against a timeout. If the timeout wins,
 * the promise is rejected with a timeout error.
 *
 * @param {Promise} promise - Promise to add timeout to
 * @param {number} [timeoutMs=5000] - Timeout in milliseconds
 * @returns {Promise<*>} Result of the promise if it completes before timeout
 * @throws {Error} Timeout error if operation exceeds timeoutMs
 *
 * @example
 * const data = await withTimeout(
 *   supabase.from('procedures').select('*'),
 *   5000  // 5 second timeout
 * );
 */
export const withTimeout = (promise, timeoutMs = 5000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};
