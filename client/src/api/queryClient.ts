import { QueryClient } from "@tanstack/react-query";


export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1, 
            staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
            gcTime: 1000 * 60 * 10, // 10 min cache 
            refetchOnWindowFocus: true, // Refetch when user switches tabs (helps with real-time updates)
        },
        mutations: {
            retry: 0, // Don't retry failed mutations
        },
    }

})

