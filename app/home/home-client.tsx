// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { HomeScreen } from "@/components/pages/home-screen"

export default function HomeClient() {
  return (
    <ErrorBoundary>
      <RequireAuthClientOnly allowIncomplete={false} allowUnverified={false}>
        <HomeScreen />
      </RequireAuthClientOnly>
    </ErrorBoundary>
  )
}
