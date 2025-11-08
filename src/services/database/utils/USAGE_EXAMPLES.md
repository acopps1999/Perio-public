# Database Error Handling & Retry Utilities - Usage Examples

## Overview

This directory contains production-grade error handling utilities for database operations:

1. **DatabaseError.js** - Custom error class with structured error information
2. **retry.js** - Exponential backoff retry logic
3. **timeout.js** - Timeout wrapper for promises

---

## 1. DatabaseError

Custom error class that provides structured error information including timestamps and context.

### Basic Usage

```javascript
import { DatabaseError } from '../errors/DatabaseError';

try {
  // Database operation
  const result = await supabase.from('procedures').select('*');

  if (result.error) {
    throw new DatabaseError('Failed to load procedures', {
      cause: result.error,
      query: 'procedures',
      action: 'SELECT'
    });
  }
} catch (error) {
  console.error(error.toJSON());
  // {
  //   name: 'DatabaseError',
  //   message: 'Failed to load procedures',
  //   details: { cause: {...}, query: 'procedures', action: 'SELECT' },
  //   timestamp: '2025-01-29T12:34:56.789Z',
  //   stack: '...'
  // }
}
```

### With Additional Context

```javascript
throw new DatabaseError('Failed to update condition', {
  cause: originalError,
  query: 'procedures',
  action: 'UPDATE',
  conditionId: 123,
  field: 'name',
  value: 'Gingivitis'
});
```

---

## 2. withRetry

Retry failed operations with exponential backoff (1s, 2s, 4s).

### Basic Usage

```javascript
import { withRetry } from './retry';

// Retry a database query
const data = await withRetry(
  async () => {
    const { data, error } = await supabase.from('procedures').select('*');
    if (error) throw error;
    return data;
  },
  3,     // max 3 retries
  1000   // start with 1 second delay
);
```

### With Custom Configuration

```javascript
// More aggressive retry (5 attempts, 500ms base delay)
const data = await withRetry(
  async () => supabase.from('procedures').select('*'),
  5,     // max 5 retries
  500    // start with 500ms delay
);
```

### Error Codes That Won't Be Retried

The following error codes will immediately fail without retrying:

- `PGRST116` - Row not found (no point retrying)
- `42P01` - Undefined table (schema issue, won't fix itself)
- `42703` - Undefined column (schema issue, won't fix itself)

```javascript
try {
  await withRetry(async () => {
    // This will throw immediately if row not found
    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('id', 99999)
      .single();

    if (error) throw error;
    return data;
  });
} catch (error) {
  if (error.code === 'PGRST116') {
    console.log('Row not found - no retries attempted');
  }
}
```

---

## 3. withTimeout

Add timeout to any promise to prevent hanging operations.

### Basic Usage

```javascript
import { withTimeout } from './timeout';

// Add 5 second timeout to a query
try {
  const data = await withTimeout(
    supabase.from('procedures').select('*'),
    5000  // 5 second timeout
  );
} catch (error) {
  if (error.message.includes('timed out')) {
    console.error('Query took too long!');
  }
}
```

### With Custom Timeout

```javascript
// Shorter timeout for simple queries
const categories = await withTimeout(
  supabase.from('categories').select('*'),
  2000  // 2 second timeout
);

// Longer timeout for complex queries
const complexData = await withTimeout(
  supabase.from('procedures_complete').select('*'),
  10000  // 10 second timeout
);
```

---

## 4. Combining All Three

Use all utilities together for production-grade error handling.

### Complete Example

```javascript
import { DatabaseError } from '../errors/DatabaseError';
import { withRetry, withTimeout } from './index';

/**
 * Load procedures with retry and timeout
 */
export const loadProcedures = async () => {
  try {
    // Retry up to 3 times with exponential backoff
    const data = await withRetry(
      async () => {
        // Add 5 second timeout
        const result = await withTimeout(
          supabase.from('procedures_complete').select('*'),
          5000
        );

        if (result.error) {
          throw new DatabaseError('Failed to load procedures', {
            cause: result.error,
            query: 'procedures_complete',
            action: 'SELECT'
          });
        }

        return result.data;
      },
      3,     // max retries
      1000   // base delay
    );

    return data;

  } catch (error) {
    console.error('Error loading procedures:', error);

    if (error.message.includes('timed out')) {
      // Handle timeout specifically
      throw new DatabaseError('Query timed out', {
        cause: error,
        query: 'procedures_complete',
        timeout: 5000
      });
    }

    throw error;
  }
};
```

### With Transform

```javascript
import { transformProcedure } from '../transformers/procedureTransformer';

export const loadProceduresTransformed = async () => {
  const rawData = await withRetry(
    async () => {
      const result = await withTimeout(
        supabase.from('procedures_complete').select('*'),
        5000
      );

      if (result.error) {
        throw new DatabaseError('Failed to load procedures', {
          cause: result.error,
          query: 'procedures_complete',
          action: 'SELECT'
        });
      }

      return result.data;
    },
    3,
    1000
  );

  // Transform raw DB format to app format
  return rawData.map(transformProcedure);
};
```

---

## 5. Integration with React Query

These utilities work seamlessly with React Query.

```javascript
import { useQuery } from '@tanstack/react-query';
import { withRetry, withTimeout } from '../services/database/utils';
import { DatabaseError } from '../services/database/errors/DatabaseError';

export const useConditions = () => {
  return useQuery({
    queryKey: ['conditions'],
    queryFn: async () => {
      return await withRetry(
        async () => {
          const result = await withTimeout(
            supabase.from('procedures_complete').select('*'),
            5000
          );

          if (result.error) {
            throw new DatabaseError('Failed to load conditions', {
              cause: result.error,
              query: 'procedures_complete'
            });
          }

          return result.data;
        },
        3,
        1000
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

---

## Testing

### Test withRetry

```javascript
// Should succeed after retries
let attemptCount = 0;
const data = await withRetry(async () => {
  attemptCount++;
  if (attemptCount < 3) {
    throw new Error('Temporary failure');
  }
  return 'success';
});
// Result: 'success' after 3 attempts

// Should not retry on PGRST116
try {
  await withRetry(async () => {
    const error = new Error('Not found');
    error.code = 'PGRST116';
    throw error;
  });
} catch (error) {
  // Fails immediately without retries
}
```

### Test withTimeout

```javascript
// Should timeout
try {
  await withTimeout(
    new Promise(resolve => setTimeout(() => resolve('done'), 10000)),
    1000  // 1 second timeout
  );
} catch (error) {
  console.log(error.message); // "Operation timed out after 1000ms"
}

// Should succeed
const result = await withTimeout(
  new Promise(resolve => setTimeout(() => resolve('done'), 500)),
  1000  // 1 second timeout
);
// Result: 'done'
```

---

## Performance Characteristics

### withRetry
- **Best case:** Single attempt (immediate)
- **Worst case:** 3 attempts with delays (1s + 2s + 4s = ~7s total)
- **Memory overhead:** Minimal (stores last error only)

### withTimeout
- **Overhead:** ~1ms (Promise.race overhead)
- **Memory:** Single timeout handle per call
- **Cleanup:** Timeout is automatically cleared when promise resolves

### DatabaseError
- **Overhead:** Negligible (simple object creation)
- **Serialization:** Fast JSON conversion via toJSON()

---

## Best Practices

1. **Always use withTimeout for user-facing queries** - Prevents UI from hanging
2. **Use withRetry for network-dependent operations** - Handles transient failures
3. **Don't retry user errors** - Only retry transient/network failures
4. **Log all DatabaseErrors** - Include full context for debugging
5. **Set reasonable timeouts** - 5s for simple queries, 10s for complex ones
6. **Monitor retry patterns** - If retries are frequent, investigate root cause

---

## Migration from Old Code

### Before (No Error Handling)

```javascript
const loadData = async () => {
  const { data } = await supabase.from('procedures').select('*');
  return data;
};
```

### After (Production-Grade)

```javascript
import { DatabaseError } from '../errors/DatabaseError';
import { withRetry, withTimeout } from '../utils';

const loadData = async () => {
  return await withRetry(
    async () => {
      const result = await withTimeout(
        supabase.from('procedures').select('*'),
        5000
      );

      if (result.error) {
        throw new DatabaseError('Failed to load procedures', {
          cause: result.error,
          query: 'procedures'
        });
      }

      return result.data;
    },
    3,
    1000
  );
};
```

---

## Summary

These utilities provide:
- **Resilience** - Automatic retry with exponential backoff
- **Reliability** - Timeout protection prevents hanging
- **Observability** - Structured errors with full context
- **Maintainability** - Clean, reusable patterns

Total code: 162 lines (46 + 81 + 35)

All utilities are fully documented with JSDoc and include comprehensive examples.
