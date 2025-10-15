import { QueryClient } from '@tanstack/react-query';

// Create a client with aggressive cache management to prevent localStorage quota issues
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - reduced to prevent cache buildup
      gcTime: 60 * 1000, // 1 minute - aggressive garbage collection to free memory quickly
      retry: 1, // Retry network failures once for resilience
      refetchOnWindowFocus: false, // Prevent unnecessary refetches on window focus
      refetchOnMount: true, // Allow necessary data refreshes on component mount
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      persister: undefined, // Explicitly disable persistence to prevent localStorage usage
    },
    mutations: {
      retry: 1, // Retry mutations once on network failure
      gcTime: 0, // Don't cache mutation results at all
    },
  },
});
