"use client"

import RequireAuth from "@/components/auth/require-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Client-only wrapper to prevent SSR errors with localStorage/cookies.
 * Use this for pages that need authentication.
 */
export function ClientOnlyWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * RequireAuth wrapper optimized for client-side only rendering.
 * No dynamic import needed - both this and RequireAuth are already client components.
 */
export function RequireAuthClientOnly({ 
  children,
  allowIncomplete = false,
  allowUnverified = true,
  allowNoPhone = false
}: { 
  children: React.ReactNode
  allowIncomplete?: boolean
  allowUnverified?: boolean
  allowNoPhone?: boolean
}) {
  return (
    <RequireAuth 
      allowIncomplete={allowIncomplete} 
      allowUnverified={allowUnverified}
      allowNoPhone={allowNoPhone}
    >
      {children}
    </RequireAuth>
  )
}

