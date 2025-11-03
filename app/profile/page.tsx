"use client"

import dynamic from 'next/dynamic'
import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"

// ⚡ Lazy load ProfileScreen
const ProfileScreen = dynamic(
  () => import("@/components/pages/user/profile-screen").then(mod => ({ default: mod.ProfileScreen })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" variant="green" />
      </div>
    )
  }
)

export default function ProfilePage() {
  return (
    <ErrorBoundary>
      <RequireAuthClientOnly allowIncomplete allowUnverified>
        <ProfileScreen />
      </RequireAuthClientOnly>
    </ErrorBoundary>
  )
}
