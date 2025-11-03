// ✅ CLIENT COMPONENT - Handles interactivity
"use client"

import { ErrorBoundary } from "@/components/error-boundary-wrapper"
import { MyMatchesScreen } from "@/components/pages/match/my-matches-screen"

export default function MyMatchesClient() {
  return (
    <ErrorBoundary>
      <MyMatchesScreen />
    </ErrorBoundary>
  )
}
