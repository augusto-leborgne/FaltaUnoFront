// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { ProfileScreen } from "@/components/pages/user/profile-screen"

export default function ProfileClient() {
  return (
    <ErrorBoundary>
      <RequireAuthClientOnly allowIncomplete allowUnverified>
        <ProfileScreen />
      </RequireAuthClientOnly>
    </ErrorBoundary>
  )
}
