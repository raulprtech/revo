"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        onError: (error, key) => {
          // Don't log 404 errors or expected failures
          if (error?.status !== 404) {
            console.error(`SWR Error for key "${key}":`, error);
          }
        },
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </SWRConfig>
  );
}
