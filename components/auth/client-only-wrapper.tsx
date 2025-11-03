"use client"

import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Client-only wrapper to prevent SSR errors with localStorage/cookies.
 * Use this for pages that need authentication.
 */
export function ClientOnlyWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Export dynamic version of RequireAuth with SSR disabled
// FIX: Import default export directly, not with .then()
export const RequireAuthClientOnly = dynamic(
  () => import("@/components/auth/require-auth"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    ),
  }
)
