import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,    // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
