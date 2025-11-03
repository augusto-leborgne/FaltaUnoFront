// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import dynamicImport from 'next/dynamic'
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const ProfileScreen = dynamicImport(
  () => import("@/components/pages/user/profile-screen").then(mod => mod.ProfileScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function ProfileClient() {
  return (
    <ErrorBoundary>
      <RequireAuthClientOnly allowIncomplete allowUnverified>
        <ProfileScreen />
      </RequireAuthClientOnly>
    </ErrorBoundary>
  )
}
