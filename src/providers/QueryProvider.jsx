/**
 * React Query Provider
 *
 * Provides React Query client to the entire application for data fetching,
 * caching, and synchronization. This replaces manual localStorage caching
 * with a more powerful, automatic solution.
 *
 * Features:
 * - Automatic background refetching
 * - Smart cache invalidation
 * - Optimistic updates
 * - Request deduplication
 * - Automatic retries with exponential backoff
 * - Dev tools for debugging
 *
 * @module QueryProvider
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create QueryClient with optimized defaults for clinical app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before marking as stale
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,

      // Don't refetch on window focus (clinical app, users may switch windows)
      refetchOnWindowFocus: false,

      // Do refetch when reconnecting to network
      refetchOnReconnect: true,

      // Retry failed requests up to 3 times
      retry: 3,

      // Exponential backoff: 1s, 2s, 4s, max 30s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Show loading state only after 300ms to avoid flashing
      suspense: false,

      // Keep previous data while refetching (better UX)
      keepPreviousData: true,
    },
    mutations: {
      // Retry mutations once (admin operations should be more careful)
      retry: 1,

      // Shorter retry delay for mutations (500ms)
      retryDelay: 500,
    },
  },
});

/**
 * QueryProvider Component
 *
 * Wraps the application with React Query context.
 * Should be placed high in the component tree (in index.js or App.js).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 *
 * @example
 * // In index.js or App.js
 * root.render(
 *   <QueryProvider>
 *     <App />
 *   </QueryProvider>
 * );
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dev tools disabled - island icon removed per user request */}
      {/* {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginBottom: '3rem',
              marginRight: '1rem',
            },
          }}
        />
      )} */}
    </QueryClientProvider>
  );
}

// Export queryClient for advanced usage (invalidation, prefetching, etc.)
export { queryClient };

/**
 * USAGE EXAMPLES:
 *
 * // 1. Basic data fetching with automatic caching
 * function MyComponent() {
 *   const { data, isLoading, error } = useProcedures();
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   return <div>{data.map(proc => <div key={proc.id}>{proc.name}</div>)}</div>;
 * }
 *
 * // 2. Manual cache invalidation (e.g., after admin changes)
 * import { queryClient } from './providers/QueryProvider';
 * queryClient.invalidateQueries({ queryKey: ['procedures'] });
 *
 * // 3. Prefetching data
 * queryClient.prefetchQuery({
 *   queryKey: ['procedures'],
 *   queryFn: loadProcedures
 * });
 *
 * // 4. Accessing cached data
 * const cachedProcedures = queryClient.getQueryData(['procedures']);
 */
