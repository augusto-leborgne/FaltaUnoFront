"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { HomeScreen } from "@/components/pages/home-screen"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  return (
    <ErrorBoundary>
      <RequireAuthClientOnly allowIncomplete={false} allowUnverified={false}>
        <HomeScreen />
      </RequireAuthClientOnly>
    </ErrorBoundary>
  )
}
