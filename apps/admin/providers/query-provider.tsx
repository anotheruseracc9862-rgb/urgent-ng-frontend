"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@urgent/api-client";
import { ADMIN_EXPIRED_EVENT } from "@/lib/auth/shared";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => !(error instanceof ApiError && [401, 403].includes(error.status)) && count < 1,
          },
        },
      }),
  );

  useEffect(() => {
    const clear = () => { void queryClient.cancelQueries(); queryClient.clear(); };
    window.addEventListener(ADMIN_EXPIRED_EVENT, clear);
    return () => window.removeEventListener(ADMIN_EXPIRED_EVENT, clear);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
