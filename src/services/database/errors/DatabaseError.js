/**
 * Database Error Classes
 *
 * Custom error classes for database operations.
 * Provides better error handling and debugging information.
 */

/**
 * Base database error class
 */
export class DatabaseError extends Error {
  constructor(message, originalError = null, context = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error for connection issues
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message, originalError = null, context = {}) {
    super(message, originalError, context);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * Error for query failures
 */
export class DatabaseQueryError extends DatabaseError {
  constructor(message, originalError = null, context = {}) {
    super(message, originalError, context);
    this.name = 'DatabaseQueryError';
  }
}

/**
 * Error for validation failures
 */
export class DatabaseValidationError extends DatabaseError {
  constructor(message, originalError = null, context = {}) {
    super(message, originalError, context);
    this.name = 'DatabaseValidationError';
  }
}

/**
 * Error for timeout issues
 */
export class DatabaseTimeoutError extends DatabaseError {
  constructor(message, originalError = null, context = {}) {
    super(message, originalError, context);
    this.name = 'DatabaseTimeoutError';
  }
}

/**
 * Error for not found resources
 */
export class DatabaseNotFoundError extends DatabaseError {
  constructor(message, originalError = null, context = {}) {
    super(message, originalError, context);
    this.name = 'DatabaseNotFoundError';
  }
}

/**
 * Error for permission/authorization issues
 */
export class DatabasePermissionError extends DatabaseError {
  constructor(message, originalError = null, context = {}) {
    super(message, originalError, context);
    this.name = 'DatabasePermissionError';
  }
}

/**
 * Helper function to wrap Supabase errors
 * @param {Error} error - Original error
 * @param {Object} context - Additional context
 * @returns {DatabaseError} Appropriate error type
 */
export const wrapSupabaseError = (error, context = {}) => {
  const message = error.message || 'Unknown database error';

  // Check for specific error types based on message or code
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return new DatabaseTimeoutError(message, error, context);
  }

  if (message.includes('not found') || message.includes('404')) {
    return new DatabaseNotFoundError(message, error, context);
  }

  if (message.includes('permission') || message.includes('unauthorized') || message.includes('403')) {
    return new DatabasePermissionError(message, error, context);
  }

  if (message.includes('connection') || message.includes('network')) {
    return new DatabaseConnectionError(message, error, context);
  }

  // Default to query error
  return new DatabaseQueryError(message, error, context);
};
